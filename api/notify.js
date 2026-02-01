export default async function handler(req, res) {
    // 1. Check Method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 2. Check Token
    const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!LINE_ACCESS_TOKEN) {
        return res.status(500).json({ error: 'Server configuration error: Missing LINE Token' });
    }

    const { userIds, messages } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'Missing userIds' });
    }

    try {
        // 3. Send Multicast Message (Send to multiple users at once)
        const response = await fetch('https://api.line.me/v2/bot/message/multicast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                to: userIds,
                messages: messages || [
                    { type: 'text', text: 'คอร์สเรียนของคุณจบลงแล้ว! กรุณาทำแบบประเมินติดตามผล' }
                ]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send line message');
        }

        return res.status(200).json({ success: true, data });

    } catch (error) {
        console.error('Line API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
