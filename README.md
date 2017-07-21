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

## JSON chatbot specifications format

The JSON specification must have the following properties:

- `name` - This is the name of your chatbot. It will be used as a name for its own test suite
- `botId` - The Id of the chatbot that is being tested
- `channel` - An object that contains communication details of the target chatbot
    - `id` - Id of the system communication channel of the target chatbot
    - `token` - Verification token of the system communication channel of the target chatbot
- `scenarios` - an array of scenarios describing the chatbot's behavior
    - `it` - follows the idea of [behavior-driven development](https://en.wikipedia.org/wiki/Behavior-driven_development) and serves as the first word in the test name, which should be a complete sentence
    - `steps` - sequence (array) of steps defining the scenario
        - `user` - what the user says as a single message
            - `text` - text of the message
        - `bot` - what is the expected answer from the bot as an array of optional behavior. Each element is an array of messages. The step is considered valid if any sequence of messages matches the actual chatbot response
            - `text` - text of a single message
            - `quickReplies` - array of quick reply options

## Example spec

The following example spec verifies that the `Sample bot introduces itself and enters into a conversation`.

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

_Our QuickStart sample has specifications with it. Feel free to explore it in order to get more familiar with the format. Click [here](https://github.com/darvinai/samples/blob/master/QuickStart/en/spec.json) to get it. It only has `scenarios` since it is a general specification and it is not targeted at a specific chatbot isntance._
