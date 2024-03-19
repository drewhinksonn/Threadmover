const axios = require('axios');

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

exports.handler = async (event) => {
  const contentType = event.headers['content-type'] || '';
  
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(event.body);
    const payloadParam = params.get('payload');
    
    if (payloadParam) {
      // This is a modal submission
      const payload = JSON.parse(payloadParam);
      console.log('Modal submission payload:', JSON.stringify(payload, null, 2)); // Log the payload for visibility
      
      // Acknowledge the modal submission immediately to avoid Slack errors
      return {
        statusCode: 200,
        body: JSON.stringify({ response_action: "clear" }) // You might want to use "errors" here if validation fails
      };
    } else {
      // This is the initial slash command
      const trigger_id = params.get('trigger_id');
      if (trigger_id) {
        // Define and send the modal to Slack
        const modal = {
          // Modal JSON structure
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

          // Acknowledge the slash command
          return { statusCode: 200, body: '' };
        } catch (error) {
          console.error('Error opening modal:', error);
          return { statusCode: 500, body: 'Failed to open modal' };
        }
      }
    }
  } else {
    // If the content type is not as expected
    return { statusCode: 400, body: 'Unsupported content type' };
  }
};
