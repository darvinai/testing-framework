'use strict';

const Handlebars = require('handlebars');
const BbPromise = require('bluebird');
const deepAssign = require('deep-assign');
const uuid = require('uuid/v4');

const fetch = require('./fetcher').fetch;

class TestingFramework {
    constructor(config) {
        config = config || {
            apiUrl: 'https://api.darvin.ai/'
        };
        this._apiUrl = config.apiUrl;
        this._handlebars = Handlebars.create();
    }

    describe(specs, options) {
        options = options || {};
        options.rootDescribeName = options.rootDescribeName || "Spec root";
        describe(options.rootDescribeName, () => {
            if (!Array.isArray(specs)) {
                specs = [specs];
            }

            if (options && options.setup && typeof options.setup === 'function') {
                beforeAll(options.setup);
            }

            if (options && options.teardown && typeof options.teardown === 'function') {
                afterAll(options.teardown);
            }

            specs.forEach(spec => {
                if (!spec.name) {
                    throw Error('Tried to execute a spec without a name.');
                }

                if (!spec.scenarios) {
                    throw Error(`The spec '${spec.name}' does not have 'scenarios'.`);
                }

                const that = this;
                describe(spec.name, () => {

                    if (spec.parameters) {
                        this._validateParameters(spec.parameters);
                    }

                    spec.scenarios.forEach(scenario => {
                        that._validateScenario(spec, scenario);

                        if (scenario.parameters) {
                            this._validateParameters(scenario.parameters);
                            Object.assign(scenario.parameters, parameters);
                        }

                        Object.keys(scenario).forEach(key => {
                            switch (key) {
                                case 'it':
                                    it(scenario.it, done => that._executeScenario(spec, scenario, done));
                                    break;
                                case 'fit':
                                    fit(scenario.fit, done => that._executeScenario(spec, scenario, done));
                                    break;
                                case 'xit':
                                    xit(scenario.xit, done => that._executeScenario(spec, scenario, done));
                                    break;
                            }
                        });
                    });


                    if (spec.dynamic && typeof spec.dynamic === 'function') {
                        const sender = this._getSender();
                        const context = {
                            send: message => this._send(spec, sender, message)
                        };

                        spec.dynamic(context);
                    }
                });
            });
        });
    }

    _validateParameters(parameters) {
        Object.keys(parameters).forEach(parameter => {
            if (typeof parameters[parameter] !== 'string') {
                throw Error(`Only string parameters are allowed, the invalid parameter is "${parameter}".`)
            }
        });
    }

    _validateScenario(spec, scenario) {
        if (!scenario.it && !scenario.fit && !scenario.xit) {
            throw Error(`The spec '${spec.name}' has a scenario without description in 'it' / 'fit' / 'xit'.`);
        }

        if (!scenario.steps) {
            throw Error(`The spec '${spec.name}' has a scenario without 'steps'.`);
        }
    }

    _executeScenario(spec, scenario, done) {
        if (!spec.botId) {
            throw Error(`The spec '${spec.name}' does not have 'botId'.`);
        }

        if (!spec.channel) {
            throw Error(`The spec '${spec.name}' does not have 'channel' configured.`);
        }

        if (spec.parameters) {
            scenario.parameters = Object.assign({}, spec.parameters, scenario.parameters);
        }

        const that = this;
        const sender = this._getSender(spec.sender);
        BbPromise.each(scenario.steps, step => that._executeStep(spec, scenario, step, sender))
            .then(done)
            .catch(done.fail);
    }

    _getSender(sender) {
        const name = sender && sender.name || 'test-user';
        const id = `${sender && sender.id || name}-${sender && sender.uuid || uuid()}`;
        return {
            id,
            name
        };
    }

    _executeStep(spec, scenario, step, sender) {
        let message = Object.assign({}, step.user, {
            mocks: deepAssign({}, spec.mocks, scenario.mocks, step.mocks),
            contextMock: deepAssign({}, spec.contextMock, scenario.contextMock, step.contextMock)
        });

        const context = Object.assign({}, scenario.parameters, { spec });
        message = this._formatMessage(message, context);

        return this._send(spec, sender, message)
            .then(response => this._verifyStep(step, response, context));
    }

    _send(spec, sender, message) {
        const channelUrl = `${this._apiUrl}/bots/${spec.proxyBotId || spec.botId}/channels/${spec.channel.id}/darvin`;
        const payload = {
            sender,
            message
        };

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${spec.channel.token}`
            },
            body: JSON.stringify(payload)
        };

        if (spec.headers) {
            Object.assign(options.headers, spec.headers);
        }

        return fetch(channelUrl, options)
            .then(response => {
                if (response.status < 200 || response.status >= 300) {
                    throw Error(response.statusText + ': ' + response.url);
                }

                return response.json();
            });
    }

    _verifyStep(step, response, context) {
        if (step.bot) {
            let index = response.findIndex(m => m.type === 'event');
            while (index >= 0) {
                response.splice(index, 1);
                index = response.findIndex(m => m.type === 'event');
            }

            const isValidResponse = step.bot.some(expectedResponses => {
                if (expectedResponses.length !== response.length) {
                    console.error(`RESPONSES LENGTHS DOES NOT MATCH:\nEXPECT: ${expectedResponses.length}\nACTUAL: ${response.length}`);
                    return false;
                }

                return expectedResponses.map(response => this._formatMessage(response, context))
                    .every((expectedResponse, i) =>
                        this._verify(expectedResponse, response[i], this._verifyResponse.bind(this)));
            });

            if (!isValidResponse) {
                throw Error(`UNEXPECTED RESPONSE. \nEXPECT: ${JSON.stringify(step.bot)}. \nACTUAL: ${JSON.stringify(response)}`);
            }
        }
    }

    _verify(expected, actual, validation) {
        let keys = Object.keys(expected);
        if (Object.keys(actual).length !== keys.length) {
            console.error(`KEYS DOES NOT MATCH:\nKEYS EXPECT: ${keys}\nKEYS ACTUAL: ${Object.keys(actual)}`);
            return false;
        }

        for (const key of keys) {
            let isValid = validation(expected, actual, key);

            if (!isValid) {
                throw Error(`FAILED VERIFICATION:\nKEY: ${key}\nEXPECT: ${JSON.stringify(expected)}\nACTUAL: ${JSON.stringify(actual)}`);
            }
        }

        return true;
    }

    _verifyResponse(expectedResponse, actualResponse, key) {
        switch (key) {
            case 'text': {
                const expectedText = expectedResponse.text;
                if (Array.isArray(expectedText)) {
                    return expectedText.includes(actualResponse.text);
                }

                return expectedText === actualResponse.text;
            }
            case 'textStartsWith': {
                const expectedText = expectedResponse.textStartsWith;

                return actualResponse.text.startsWith(expectedText);
            }
            case 'textIncludes': {
                const expectedText = expectedResponse.textIncludes;
                if (Array.isArray(expectedText)) {
                    return expectedText.reduce((accumulator, currentValue) => accumulator && actualResponse.text.includes(currentValue));
                }

                return actualResponse.text.includes(expectedText);
            }
            case 'template':
                return this._verify(expectedResponse.template, actualResponse.template, this._verifyTemplate.bind(this));
            default:
                return JSON.stringify(expectedResponse[key]) === JSON.stringify(actualResponse[key]);
        }
    }

    _verifyTemplate(expectedTemplate, actualTemplate, key) {
        switch (key) {
            case 'buttons':
                if (expectedTemplate.buttons.length !== actualTemplate.buttons.length) {
                    return false;
                }

                return expectedTemplate.buttons.every((expectedButton, i) =>
                    this._verify(expectedButton, actualTemplate.buttons[i], this._verifyTemplateButton.bind(this)));
            default:
                return JSON.stringify(expectedTemplate[key]) === JSON.stringify(actualTemplate[key]);
        };
    }

    _verifyTemplateButton(expectedButton, actualButton, key) {
        switch (key) {
            case 'url':
                return actualButton.url.startsWith(expectedButton.url);
            default:
                return JSON.stringify(expectedButton[key]) === JSON.stringify(actualButton[key]);
        };
    }

    _formatMessage(message, context) {
        if (!context || Object.keys(context) === 0) {
            return message;
        }

        return JSON.parse(this._handlebars.compile(JSON.stringify(message), { noEscape: true })(context));
    }
}

module.exports = TestingFramework;
