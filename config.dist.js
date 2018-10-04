
module.exports = {
    "hostname": "http://redmine.yourdomain.tld",
    "auth": {
        "username": "...",
        "password": "...",
        "key": "..."
    },
    getTicketUrl: ticket => (`http://.../${ticket.id}?...`),
    "project": {
        parentId: '...',
        colors: {
            '...': 'yellow',
            '...': 'green',
            '...': 'white',
        }
    }
}