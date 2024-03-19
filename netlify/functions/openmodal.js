const axios = require('axios');

// SLACK_BOT_TOKEN is used for actions like posting messages and opening modals.
// SLACK_USER_TOKEN is used for user-level actions like deleting messages.
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_USER_TOKEN = process.env.SLACK_USER_TOKEN;

exports.handler = async (event) => {
  let payload;

  
  try {
    payload = JSON.parse(event.body);
  } catch (error) {
   
    payload = JSON.parse(decodeURIComponent(event.body).replace('payload=', ''));
  }


  if (payload.command) {

    const { trigger_id } = payload;
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

    try {
      await axios.post('https://slack.com/api/views.open', {
        trigger_id,
        view: modal
      }, {
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      return { statusCode: 200, body: '' };
    } catch (error) {
      console.error('Error opening modal:', error);
      return { statusCode: 500, body: 'Failed to open modal' };
    }
  } else if (payload.type === 'view_submission' && payload.view.callback_id === 'move-thread-modal') {
  
    const values = payload.view.state.values;
    const threadLink = values.thread_link.input.value;
    const newChannelID = values.target_channel.select.selected_channel;
    const confirmation = values.confirmation.checkbox.selected_options.length > 0;

    if (!confirmation) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          response_action: "errors",
          errors: {
            "confirmation": "You must confirm the action."
          }
        })
      };
    }

   
    const linkParts = threadLink.split('/');
    const channelID = linkParts[linkParts.indexOf('archives') + 1];
    let timestamp = linkParts[linkParts.indexOf('p') + 1];
    timestamp = `${timestamp.slice(0, -6)}.${timestamp.slice(-6)}`;

    try {
   
      const repliesResponse = await axios.get('https://slack.com/api/conversations.replies', {
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        },
        params: {
          channel: channelID,
          ts: timestamp
        },
      });

     
      if (repliesResponse.data.ok && repliesResponse.data.messages.length > 0) {
        let threadTsInNewChannel = null;

        for (const [index, message] of repliesResponse.data.messages.entries()) {
       
          const postResponse = await axios.post('https://slack.com/api/chat.postMessage', {
            channel: newChannelID,
            text: message.text,
            thread_ts: index === 0 ? undefined : threadTsInNewChannel,
          }, {
            headers: {
              'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (postResponse.data.ok && index === 0) {
            threadTsInNewChannel = postResponse.data.ts; 
          }

          await new Promise(resolve => setTimeout(resolve, 200)); 
        }

       
        for (const message of repliesResponse.data.messages) {
          await axios.post('https://slack.com/api/chat.delete', {
            channel: channelID,
            ts: message.ts,
          }, {
            headers: {
              'Authorization': `Bearer ${SLACK_USER_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });
        }
      }

      return { statusCode: 200, body: '' };
    } catch (error) {
      console.error('Error moving thread:', error);
      return { statusCode: 500, body: 'Failed to move thread' };
    }
  } else {
    // Fallback for unhandled event types
    return { statusCode: 200, body: 'Unhandled event type' };
  }
};
