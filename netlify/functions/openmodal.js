const axios = require('axios');

// Assuming SLACK_BOT_TOKEN is defined in your environment variables for authorization
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

exports.handler = async (event) => {
  // Parse the incoming event
  const contentType = event.headers['content-type'] || '';
  let payload;

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(event.body);
    const payloadParam = params.get('payload');
    
    // Check if this is a modal submission
    if (payloadParam) {
      payload = JSON.parse(payloadParam);
      console.log('Modal submission payload:', payload); // Log the modal submission payload
      // You can process the payload here
      
      return {
        statusCode: 200,
        body: JSON.stringify({ text: 'Processing modal submission...' })
      };
    } else {
      // Handle the slash command
      const trigger_id = params.get('trigger_id');
      if (trigger_id) {
        // Define the modal
        const modal = {
          "type": "modal",
          "callback_id": "your_modal_callback_id", // Ensure this matches your modal's callback_id
          "title": {
            "type": "plain_text",
            "text": "My Modal"
          },
          "submit": {
            "type": "plain_text",
            "text": "Submit"
          },
          "blocks": [
            {
              "type": "input",
              "block_id": "input_block",
              "element": {
                "type": "plain_text_input",
                "action_id": "input",
                "placeholder": {
                  "type": "plain_text",
                  "text": "Enter something..."
                }
              },
              "label": {
                "type": "plain_text",
                "text": "Label"
              }
            }
          ]
        };

        try {
          await axios.post('https://slack.com/api/views.open', {
            trigger_id: trigger_id,
            view: modal
          }, {
            headers: {
              'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          return {
            statusCode: 200,
            body: ''
          };
        } catch (error) {
          console.error('Error opening modal:', error);
          return {
            statusCode: 500,
            body: 'Failed to open modal'
          };
        }
      }
    }
  } else {
    // Unsupported content type
    return {
      statusCode: 400,
      body: 'Unsupported content type'
    };
  }
};
