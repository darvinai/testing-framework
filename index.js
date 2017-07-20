'use strict';

const BbPromise = require('bluebird');
const uuid = require('uuid/v4');
const fetch = require('node-fetch');

class TestingFramework {
    constructor(config) {
        config = config || { apiUrl: 'https://api.darvin.ai/' };
        this._apiUrl = config.apiUrl;
    }

    describe(spec, options) {
        if (!spec.name) {
            throw Error(`Tried to execute a spec without a name.`);
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
                it(scenario.it, done => that._executeScenario(spec, scenario, done));
            });
        });
    }

    _validateScenario(spec, scenario) {
        if (!scenario.it) {
            throw Error(`The spec '${spec.name}' has a scenario without description in 'it'.`);
        }

        if (!scenario.steps) {
            throw Error(`The spec '${spec.name}' has a scenario without 'steps' in it.`);
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
        const sender = {
            id: 'tempuser-' + uuid()
        };

        BbPromise.each(scenario.steps, step => that._executeStep(spec, sender, step))
            .then(done)
            .catch(done.fail);
    }

    _executeStep(spec, sender, step) {
        const channelUrl = `${this._apiUrl}v1/bots/${spec.botId}/channels/${spec.channel.id}/darvin`;
        const message = {
            sender,
            message: step.user
        };

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${spec.channel.token}`
            },
            body: JSON.stringify(message)
        };

        const that = this;
        return fetch(channelUrl, options)
            .then(response => {
                if (response.status < 200 || response.status >= 300) {
                    throw Error(response.statusText + ': ' + response.url);
                }

                return response.json();
            })
            .then(response => that._verifyStep(step, response));
    }

    _verifyStep(step, response) {
        expect(step.bot.map(JSON.stringify)).toContain(JSON.stringify(response));
    }
}

module.exports = TestingFramework;