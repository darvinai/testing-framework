'use strict';

const BbPromise = require('bluebird');
const uuid = require('uuid/v4');

const fetch = require('./fetcher').fetch;

class TestingFramework {
    constructor(config) {
        config = config || {
            apiUrl: 'https://api.darvin.ai/'
        };
        this._apiUrl = config.apiUrl;
    }

    describe(spec, options) {
        if (!spec.name) {
            throw Error('Tried to execute a spec without a name.');
        }

        if (!spec.scenarios) {
            throw Error(`The spec '${spec.name}' does not have 'scenarios'.`);
        }

        const that = this;
        describe(spec.name, () => {
            if (options && options.setup && typeof options.setup === 'function') {
                beforeAll(options.setup);
            }

            if (options && options.teardown && typeof options.teardown === 'function') {
                afterAll(options.teardown);
            }

            spec.scenarios.forEach(scenario => {
                that._validateScenario(spec, scenario);
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

        const that = this;
        const sender = this._getSender(spec.sender);

        BbPromise.each(scenario.steps, step => that._executeStep(spec, scenario, step, sender))
            .then(done)
            .catch(done.fail);
    }

    _getSender(sender) {
        const name = sender && sender.name || 'test-user';
        const id = `${sender && sender.id || name}-${sender && sender.uuid || uuid()}`;

        return { id, name };
    }

    _executeStep(spec, scenario, step, sender) {
        const message = Object.assign({}, step.user, {
            mocks: Object.assign({}, scenario.mocks, step.mocks),
            contextMock: Object.assign({}, spec.contextMock, scenario.contextMock, step.contextMock)
        });
        return this._send(spec, sender, message)
            .then(response => this._verifyStep(step, response));
    }

    _send(spec, sender, message) {
        const channelUrl = `${this._apiUrl}v1/bots/${spec.botId}/channels/${spec.channel.id}/darvin`;
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

        return fetch(channelUrl, options)
            .then(response => {
                if (response.status < 200 || response.status >= 300) {
                    throw Error(response.statusText + ': ' + response.url);
                }

                return response.json();
            });
    }

    _verifyStep(step, response) {
        if (step.bot) {
            let index = response.findIndex(m => m.type === 'event');
            while (index >= 0) {
                response.splice(index, 1);
                index = response.findIndex(m => m.type === 'event');
            }

            expect(step.bot.map(JSON.stringify)).toContain(JSON.stringify(response));
        }
    }
}

module.exports = TestingFramework;
