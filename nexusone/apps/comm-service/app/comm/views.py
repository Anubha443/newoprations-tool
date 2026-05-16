import re
import httpx
from django.db.models import Q
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Channel, Topic, Message, DirectMessage, DMMessage, Notification, ChannelMember
from .serializers import ChannelSerializer, MessageSerializer, DirectMessageSerializer, DMMessageSerializer

MENTION_RE = re.compile(r'@([\w.\-+]+@[\w.\-]+)')


def _user(request):
    return getattr(request, 'user_payload', {})


@api_view(['GET', 'POST'])
def channels(request):
    if request.method == 'GET':
        qs = Channel.objects.filter(org_id=_user(request).get('organization_id'))
        return Response(ChannelSerializer(qs, many=True).data)
    serializer = ChannelSerializer(data={**request.data, 'created_by': _user(request).get('sub')})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=201)


@api_view(['GET'])
def channel_messages(request, id):
    topic = request.GET.get('topic')
    before = request.GET.get('before')
    limit = int(request.GET.get('limit', 50))
    qs = Message.objects.filter(channel_id=id, is_deleted=False)
    if topic:
        qs = qs.filter(topic__name=topic)
    if before:
        qs = qs.filter(id__lt=before)
    return Response(MessageSerializer(qs.order_by('-id')[:limit], many=True).data)


@api_view(['POST'])
def create_message(request):
    data = request.data.copy()
    data['sender_id'] = _user(request).get('sub')
    topic, _ = Topic.objects.get_or_create(channel_id=data['channel'], name=data.get('topic_name', 'general'))
    data['topic'] = topic.id
    serializer = MessageSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    msg = serializer.save(search_vector=data.get('content', '').lower())
    topic.last_message_at = timezone.now(); topic.message_count += 1; topic.save(update_fields=['last_message_at', 'message_count'])
    for mentioned in MENTION_RE.findall(msg.content):
        Notification.objects.create(user_id=_user(request).get('sub'), type='mention', payload={'email': mentioned, 'message_id': msg.id})
    return Response(MessageSerializer(msg).data, status=201)


@api_view(['PUT'])
def update_message(request, id):
    msg = Message.objects.get(id=id, is_deleted=False)
    if str(msg.sender_id) != str(_user(request).get('sub')):
        return Response({'error': 'forbidden'}, status=403)
    msg.content = request.data.get('content', msg.content)
    msg.edited_at = timezone.now()
    msg.search_vector = msg.content.lower()
    msg.save(update_fields=['content', 'edited_at', 'search_vector'])
    return Response(MessageSerializer(msg).data)


@api_view(['DELETE'])
def delete_message(request, id):
    msg = Message.objects.get(id=id)
    msg.is_deleted = True
    msg.save(update_fields=['is_deleted'])
    return Response(status=204)


@api_view(['POST'])
def react_message(request, id):
    msg = Message.objects.get(id=id)
    emoji = request.data.get('emoji', '👍')
    user = _user(request).get('sub')
    reactions = msg.reactions or {}
    reactions.setdefault(emoji, [])
    if user not in reactions[emoji]:
        reactions[emoji].append(user)
    msg.reactions = reactions
    msg.save(update_fields=['reactions'])
    return Response(MessageSerializer(msg).data)


@api_view(['GET', 'POST'])
def dm(request):
    if request.method == 'GET':
        user = _user(request).get('sub')
        qs = DirectMessage.objects.filter(participants__contains=[user])
        return Response(DirectMessageSerializer(qs, many=True).data)
    serializer = DirectMessageSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    obj = serializer.save()
    return Response(DirectMessageSerializer(obj).data, status=201)


@api_view(['POST'])
def summarize_topic(request, id, topic):
    messages = Message.objects.filter(channel_id=id, topic__name=topic, is_deleted=False).order_by('created_at')[:200]
    text = '\n'.join([m.content for m in messages])
    ai_url = request.headers.get('X-AI-Service-URL', 'http://api-gateway:4000/internal/ai/summarize')
    try:
        with httpx.Client(timeout=15) as client:
            result = client.post(ai_url, json={'channel_id': id, 'topic': topic, 'content': text}).json()
    except Exception:
        result = {'summary': 'AI service unavailable'}
    return Response(result)


@api_view(['GET'])
def search_messages(request):
    q = request.GET.get('q', '').lower()
    channel_id = request.GET.get('channel_id')
    qs = Message.objects.filter(is_deleted=False, search_vector__contains=q)
    if channel_id:
        qs = qs.filter(channel_id=channel_id)
    return Response(MessageSerializer(qs.order_by('-id')[:100], many=True).data)


@api_view(['POST'])
def read_receipt(request, channel_id, topic):
    ChannelMember.objects.filter(channel_id=channel_id, user_id=_user(request).get('sub')).update(last_read_at=timezone.now())
    return Response({'ok': True, 'topic': topic})
