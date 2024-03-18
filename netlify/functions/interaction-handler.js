const axios = require('axios');

exports.handler = async (event) => {
  
  const payload = JSON.parse(decodeURIComponent(event.body).replace('payload=', ''));
  
  
  if (payload.type === 'view_submission' && payload.view.callback_id === 'move-thread-modal') {
    const values = payload.view.state.values;
    const threadLink = values.thread_link.input.value;
    const newChannelID = payload.view.state.values.target_channel.select.selected_channel;

    const confirmation = values.confirmation.checkbox.selected_options.length > 0;

    
    if (!confirmation || confirmation.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          response_action: "errors",
          errors: {
            "confirmation_block": "You must confirm the action." 
          }
        })
      };
    }

    
    const linkParts = threadLink.split('/');
    const channelID = linkParts[linkParts.indexOf('archives') + 1];
    let timestamp = linkParts[linkParts.indexOf('archives') + 2].substring(1); 
    timestamp = timestamp.slice(0, -6) + "." + timestamp.slice(-6); 
    console.log(timestamp, channelID);

    try {
     
      const repliesResponse = await axios.get('https://slack.com/api/conversations.replies', {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`, 
        },
        params: {
          channel: channelID,
          ts: timestamp
        },
      });
  

      if (repliesResponse.data.ok && repliesResponse.data.messages && repliesResponse.data.messages.length > 0) {
        let threadTsInNewChannel = null; 
        
        for (const [index, message] of repliesResponse.data.messages.entries()) {
          const postResponse = await axios.post('https://slack.com/api/chat.postMessage', {
            channel: newChannelID,
            text: message.text,
            thread_ts: index === 0 ? undefined : threadTsInNewChannel, 
            headers: {
              Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 
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
              Authorization: `Bearer ${SLACK_USER_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });
        }
      } else {
        console.log("No messages found or unable to fetch thread.");
      }

      return {
        statusCode: 200,
        body: '',
      };
    } catch (error) {
      console.error('Error moving thread:', error);
      return {
        statusCode: 500,
        body: 'Failed to move thread',
      };
    }
  } else {
   
    return {
      statusCode: 200,
      body: 'Unhandled event type',
    };
  }
};
