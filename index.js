import axios from 'axios'
import express from 'express'
import bodyParser from 'body-parser'

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const { LINE_COLOR, HOST, PORT, DOMAIN, BOT_NAME, SLACK_URL } = process.env
const app = new express()

const ACTION_TYPES = {
  1: 'Add to',
  2: 'Update',
  3: 'Comment',
  5: 'Add wiki',
  6: 'Update wiki',
  11: 'svn Commit',
  12: 'Git Push',
  14: 'Issue updated collectively',
  18: 'Submit Pull Request',
  19: 'Update Pull Request',
  20: 'Comment Pull Request'
}

function getComment (body) {
  return (body.content.revisions ? body.content.revisions[0].comment : false) || (body.content.comment ? body.content.comment.content : false) || body.content.description
}

function getURL (body) {
  let url = DOMAIN;
  switch (body.type) {
    case 1:
    case 2:
    url += `view/${body.project.projectKey}-${body.content.key_id}`
    break;

    case 3:
    url += `view/${body.project.projectKey}-${body.content.key_id}#comment-${body.content.comment.id}`;
    break;

    case 5:
    case 6:
    url += `alias/wiki/${body.content.id}`
    break;

    case 11:
    url += `rev/${body.project.projectKey}/${body.content.rev}`
    break;

    case 12:
    url += `git/${body.project.projectKey}/${body.content.repository.name}/${body.content.revision_type}/${body.content.revisions[0].rev}`
    break;

    case 18:
    case 19:
    url += `git/${body.project.projectKey}/${body.content.repository.name}/pullRequests/${body.content.number}`
    break;

    case 20:
    url += `git/${body.project.projectKey}/${body.content.repository.name}/pullRequests/${body.content.number}#comment-${body.content.comment.id}`
    break;
  }
  return url;
}

function createPayload (channel, body) {
  const text =`[${body.project.projectKey}${body.content.key_id ? '-' + body.content.key_id : ''}] ${ACTION_TYPES[body.type]} ${body.content.summary || ''} by ${body.createdUser.name}
  ${getURL(body)}
  `
  return {
    channel: channel,
    username: BOT_NAME,
    text: "BackLog Update",
    attachments: [
      {
        "color": LINE_COLOR || '#42ce9f',
        "pretext": (body.content.summary || ''),
        "text": getURL(body),
        "fields": [
          {
            "title": "ID",
            "value": `[${body.project.projectKey}${body.content.key_id ? '-' + body.content.key_id : ''}]`,
            "short": true
          },
          {
            "title": "Event",
            "value": ACTION_TYPES[body.type],
            "short": true
          },
          {
            title: "Author",
            value: body.createdUser.name,
            short: true
          },
          {
            title: "User",
            value: body.content.assignee ? body.content.assignee.name : '',
            short: true
          },
          {
            "title": "Contents",
            "value": getComment(body),
            "short": false
          }
        ]
      }
    ]
  }
}

function doSend () {

}

app.use(bodyParser());
app.post('/:channel', (req, res) => {
  axios.post(
    SLACK_URL,
    createPayload(req.params.channel, req.body)
  )
  .then(({data}) => {
    res.json({result: 'success'});
  })
  .catch((err) => {
    console.log(err)
  })
})

const server = app.listen(PORT || 3000, HOST || '0.0.0.0', () => {
  const host = server.address().address;
  const port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port)
});
