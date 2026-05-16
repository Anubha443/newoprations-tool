import json
from channels.generic.websocket import AsyncWebsocketConsumer


class CommConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope.get('headers', [])
        self.room_group_name = 'comm_presence'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        await self.channel_layer.group_send(self.room_group_name, {'type': 'presence', 'status': 'online'})

    async def disconnect(self, close_code):
        await self.channel_layer.group_send(self.room_group_name, {'type': 'presence', 'status': 'offline'})
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        data = json.loads(text_data or '{}')
        event = data.get('event')
        if event == 'heartbeat':
            await self.send(json.dumps({'event': 'presence', 'status': 'online'}))
        elif event == 'typing':
            await self.channel_layer.group_send(self.room_group_name, {'type': 'broadcast', 'payload': {'event': 'typing', 'channel_id': data.get('channel_id'), 'topic': data.get('topic'), 'user_id': data.get('user_id')}})
        elif event == 'message':
            await self.channel_layer.group_send(self.room_group_name, {'type': 'broadcast', 'payload': data})

    async def presence(self, event):
        await self.send(json.dumps({'event': 'presence', 'status': event['status']}))

    async def broadcast(self, event):
        await self.send(json.dumps(event['payload']))
