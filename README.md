# Darvin Testing Framework
A framework for testing [Darvin.ai](https://darvin.ai/) chatbots on [nodejs](https://nodejs.org/en/) with [jasmine](https://jasmine.github.io/edge/node.html).

## Usage

1. Install

    ```bash
    npm install darvin-testing-framework
    ```

1. Require `darvin-testing-framework` in a javascript file which will be executed by jasmine.

    _Click [here](https://jasmine.github.io/edge/node.html) for more info about jasmine test execution._

    ```javascript
    const DarvinTestingFramework = require('darvin-testing-framework');
    const darvin = new DarvinTestingFramework();
    ```

1. Instruct the Darvin Testing Framework to define BDD specifications for your bot based on a declarative specification that you provide.

    ```javascript
    const accountantBotSpec = require('./accountant-bot.spec.json');
    const appointmentsBotSpec = require('./appointments-bot.spec.json');

    darvin.describe(accountantBotSpec);
    darvin.describe(appointmentsBotSpec);
    ```

## API Reference

```javascript
const DarvinTestingFramework = require('darvin-testing-framework');
```

### Contructor

```javascript
const tf = new DarvinTestingFramework(config)
```

`config` is optional. It allows to specify the Darvin.ai api URL. The default value for `config` is `{ apiUrl: 'https://api.darvin.ai/' }`.

### describe

```javascript
tf.describe(spec, options)
```

- `spec` is required and described [below](#specs)
- `options` is optional. It is an object that may contain
    - `setup` - a function that is called [`beforeAll`](https://jasmine.github.io/2.1/introduction#section-Setup_and_Teardown) specs
    - `teardown` - a function that is called [`afterAll`](https://jasmine.github.io/2.1/introduction#section-Setup_and_Teardown) specs

## <a name="specs"></a> Chatbot specifications reference

The JSON specification must have the following properties:

- `name` - This is the name of your chatbot. It will be used as a name for its own test suite
- `botId` - The Id of the chatbot that is being tested
- `sender` - Optional information about the sender
    - `name` - The name of the sender, the default value is "test-user"
    - `id` - The sender id is a combination of the sender name and uuid or this value
- `channel` - An object that contains communication details of the target chatbot
    - `id` - Id of the system communication channel of the target chatbot
    - `token` - Verification token of the system communication channel of the target chatbot
- `dynamic` - a function that can be used to write your own scenarios imperatively while using the same chatbot context. A `context` object will be passed to this function.
    - `send` is a function that is a member of `context`. It expect a message and returns a Promise which resolves into the chatbot response.

    Example:

    ```javascript
    const spec = {
        name: 'Introduction Bot',
        botId: '5977605bd9e084db0e278836',
        channel: {
            id: '597753c6194052ef4930f4af',
            token: 'darvin-channel-secret'
        },
        dynamic: context => {
            it('responds to Hello itself', done => {
                context.send({ text: 'Hello' })
                    .then(response => {
                        expect(response.length).toBe(1);
                        expect(response[0].text).toBe('Hi there!');

                        return context.send({ text: 'What is up?' });
                    })
                    .then(response => {
                        expect(response.length).toBe(1);
                        expect(response[0].text).toBe('Not much');
                    })
                    .then(done)
                    .catch(done.fail);;
            });
        }
    };

    tf.describe(spec);
    ```
- `mocks` - a dictionary that allows you to mock the responses of specific URLs and HTTP actions against those URLs

    Example:

    ```json
    "mocks": {
        "https://api.everlive.com/v1/niuqpjk7bubu0282/Functions/ValidateDate?doctorId=24806&date=2017.08.07": {
            "GET": "OK"
        }
    }
    ```
    
    _This mocked response applies for all scenarios._
- `contextMock` - Object that will be merged with the session context, used to fast forward a conversation to specific state or change `_system` properties

    _The contextMock applies for all scenarios._

    Example:

    ```json
    "contextMock": {
        "_system": {
            "channel": {
                "ProviderName": "facebook"
            }
        },
        "date": "March 2018",
        "_raw": {
            "date": "01.03.2018"
        }
    }
    ```
- `parameters` - You can provide a dictionary of frequently used strings in your tests, e.g. urls, and use them in the tests definitions with the handlebars format

    _These parameters will be applied to all scenarios._

    Example:

    ```json
    "parameters": {
        "webviewsUrl": "https://webviews.darvin.ai/v1/bots/"
    },
    "scenarios": [
        {
            "it": "test name",
            "steps": [
                {
                    "user": {
                        "text": "some user message"
                    },
                    "bot": [
                        [
                            {
                                "text": "What is your country of residence?",
                                "template": {
                                    "type": "button",
                                    "buttons": [
                                        {
                                            "url": "{{webviewsUrl}}",
                                            "title": "Choose a country"
                                        }
                                    ]
                                }
                            }
                        ]
                    ]
                }
            ]
        }
    ```
 
- `scenarios` - an array of scenarios describing the chatbot's behavior
    - `it`, `fit` or `xit` - follows the idea of [behavior-driven development](https://en.wikipedia.org/wiki/Behavior-driven_development) and serves as the first word in the test name, which should be a complete sentence
        - `fit` - if there are tests defined with `fit`, only those tests will be executed, otherwise all `it` tests will be executed
        - `xit` - tests defined with `xit` will not be executed
    - `mocks` - The same as spec definition mocks, but applies only to the scenario steps
    - `contextMock` - The same as spec definition contextMock, applies only to this scenario
    - `parameters` - The same as spec definition parameters, applies only to this scenario
    - `steps` - sequence (array) of steps defining the scenario
        - `user` - what the user says as a single message
            - `text` - text of the message
            - `location` - location object with latitude and longitude

                Example:

                ```json
                 "user": {
                        "location": {
                            "latitude": 42.6977082,
                            "longitude": 23.3218675
                        }
                    }
                ```
        - `bot` - what is the expected answer from the bot as an array of optional behavior. Each element is an array of messages. The step is considered valid if any sequence of messages matches the actual chatbot response
            - `text` - text of a single message or an array of possible messages
            - `quickReplies` - array of quick reply options
            - `template` - an object describing complex response elements, such as buttons
                
                Example:
                
                ```json
                "template": {
                    "type": "button",
                    "buttons": [{
                        "url": "https://webviews.darvin.ai/v1/bots/BOT_ID/...",
                        "title": "Pick country"
                    }]
                }
                ```
                
                _Note: the 'url' is checked for starts-with instead of equality_
                
        - `mocks` - The same as spec definition mocks, but applies only when the bot is responding to the message in the current step.
        - `contextMock` - The same as spec definition contextMock, but the contexts will be merged when the current step is reached.
   

## Example specification

The following example specification verifies that the `Sample bot introduces itself and enters into a conversation`.

```json
{
    "name": "Sample bot",
    "botId": "[your bot id]",
    "channel": {
        "id": "[id of the system channel]",
        "token": "[verification token]"
    },
    "scenarios": [
        {
            "it": "introduces itself and enters into a conversation",
            "steps": [
                {
                    "user": { "text": "hi" },
                    "bot": [   
                        [
                            { 
                                "text": "This is a getting started conversation for your chatbot.",
                                "quickReplies": ["Conversation 1", "Conversation 2"]
                            }
                        ]
                    ]
                },
                {
                    "user": { "text": "Conversation 1" },
                    "bot": [
                        [
                            { 
                                "text": "This is conversation 1"
                            }
                        ]
                    ]
                }
            ]
        }
    ]
}
```

_Our QuickStart sample has specifications with it. Feel free to explore it in order to get more familiar with the format. Click [here](https://github.com/darvinai/samples/blob/master/QuickStart/en/tests.json) to get it. It only has `scenarios` since it is a general specification and it is not targeted at a specific chatbot isntance._
