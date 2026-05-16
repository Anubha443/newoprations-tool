from rest_framework import serializers
from markdown import markdown
from .models import Channel, Topic, Message, DirectMessage, DMMessage


class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = '__all__'


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = '__all__'


class MessageSerializer(serializers.ModelSerializer):
    rendered_html = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = '__all__'

    def get_rendered_html(self, obj):
        return markdown(obj.content) if obj.content_type == 'markdown' else obj.content


class DirectMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DirectMessage
        fields = '__all__'


class DMMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DMMessage
        fields = '__all__'
