const axios = require('axios');

exports.handler = async (event) => {
  const params = new URLSearchParams(event.body);
  const trigger_id = params.get('trigger_id');
  const channel_id = params.get('channel_id'); 
 console.log(event.body);
  const modal = {
    "type": "modal",
    "callback_id": "move-thread-modal",
    "title": {
      "type": "plain_text",
      "text": "Move Thread"
    },
    "submit": {
      "type": "plain_text",
      "text": "Submit"
    },
    "blocks": [
      {
        "type": "input",
        "block_id": "thread_link",
        "element": {
          "type": "plain_text_input",
          "action_id": "input",
          "placeholder": {
            "type": "plain_text",
            "text": "Paste the link to the thread here"
          }
        },
        "label": {
          "type": "plain_text",
          "text": "Thread Link"
        }
      },
      {
        "type": "input",
        "block_id": "target_channel",
        "element": {
          "type": "channels_select",
          "action_id": "select",
          "placeholder": {
            "type": "plain_text",
            "text": "Select the channel"
          }
        },
        "label": {
          "type": "plain_text",
          "text": "Target Channel"
        }
      },
      {
        "type": "input",
        "block_id": "confirmation",
        "element": {
          "type": "checkboxes",
          "options": [
            {
              "text": {
                "type": "mrkdwn",
                "text": "I have informed the people in the thread I will be moving this thread"
              },
              "value": "confirmed"
            }
          ],
          "action_id": "checkbox"
        },
        "label": {
          "type": "plain_text",
          "text": "Confirmation"
        }
      }
    ]
  };

  await axios.post('https://slack.com/api/views.open', {
    trigger_id,
    view: modal
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  return {
    statusCode: 200,
    body: ''
  };
};
