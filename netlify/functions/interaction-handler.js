const axios = require('axios');

exports.handler = async (event) => {
    try {
        // Parse the payload from the incoming request
        const body = JSON.parse(event.body);

        // Verify if the payload contains the necessary information
        if (!body.payload) {
            return { statusCode: 400, body: 'No payload content' };
        }

        // Extract the payload from the request body
        const payload = JSON.parse(body.payload);

        // Verify if the payload contains the expected type
        if (payload.type !== 'view_submission') {
            return { statusCode: 200, body: 'Unhandled event type' };
        }

        // Extract necessary information from the payload
        const values = payload.view.state.values;
        const threadLink = values.thread_link.input.value;
        const newChannelID = values.target_channel.select.selected_channel;
        const confirmation = values.confirmation.checkbox.selected_options.length > 0;

        // Check if the user confirmed the action
        if (!confirmation) {
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

        // Extract channel ID and timestamp from the thread link
        const linkParts = threadLink.split('/');
        const channelID = linkParts[linkParts.indexOf('archives') + 1];
        let timestamp = linkParts[linkParts.indexOf('archives') + 2].substring(1);
        timestamp = timestamp.slice(0, -6) + "." + timestamp.slice(-6);

        // Retrieve the thread from Slack API
        const repliesResponse = await axios.get('https://slack.com/api/conversations.replies', {
            headers: {
                Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            },
            params: {
                channel: channelID,
                ts: timestamp
            },
        });

        // Check if the thread messages were retrieved successfully
        if (repliesResponse.data.ok && repliesResponse.data.messages && repliesResponse.data.messages.length > 0) {
            let threadTsInNewChannel = null;

            // Iterate over each message in the thread
            for (const [index, message] of repliesResponse.data.messages.entries()) {
                // Post each message to the new channel
                const postResponse = await axios.post('https://slack.com/api/chat.postMessage', {
                    channel: newChannelID,
                    text: message.text,
                    thread_ts: index === 0 ? undefined : threadTsInNewChannel,
                }, {
                    headers: {
                        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                });

                // Update the thread timestamp for replies
                if (postResponse.data.ok && index === 0) {
                    threadTsInNewChannel = postResponse.data.ts;
                }

                // Add delay between messages (optional)
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // Delete the thread messages from the original channel
            for (const message of repliesResponse.data.messages) {
                await axios.post('https://slack.com/api/chat.delete', {
                    channel: channelID,
                    ts: message.ts,
                }, {
                    headers: {
                        Authorization: `Bearer ${process.env.SLACK_USER_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                });
            }
        } else {
            console.log("No messages found or unable to fetch thread.");
        }

        // Return success response
        return {
            statusCode: 200,
            body: '',
        };
    } catch (error) {
        // Handle any errors that occur during processing
        console.error('Error processing event:', error);
        return {
            statusCode: 500,
            body: 'Failed to process event',
        };
    }
};
