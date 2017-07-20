# Darvin Testing Framework
A framework for testing (Darvin.ai)[https://darvin.ai/] chatbots on [nodejs](https://nodejs.org/en/) with [jasmine](https://jasmine.github.io/edge/node.html).

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
- `channel`
    - `id`
    - `token`
- `scenarios`

_Our QuickStart sample has specifications with it. Feel free to explore it in order to get more familiar with the format. Click [here](https://github.com/darvinai/samples/blob/master/QuickStart/en/spec.json) to get it. It only has `scenarios` since it is a general specification and not targeted at a specific chatbot isntance._
