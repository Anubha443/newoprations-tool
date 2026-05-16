from django.db import models
from django.contrib.postgres.indexes import GinIndex


class Channel(models.Model):
    class ChannelType(models.TextChoices):
        PUBLIC = 'public'
        PRIVATE = 'private'
        DM = 'dm'

    id = models.BigAutoField(primary_key=True)
    org_id = models.UUIDField()
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=12, choices=ChannelType.choices)
    created_by = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'channels'


class ChannelMember(models.Model):
    class MemberRole(models.TextChoices):
        ADMIN = 'admin'
        MEMBER = 'member'

    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    user_id = models.UUIDField()
    role = models.CharField(max_length=12, choices=MemberRole.choices, default=MemberRole.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'channel_members'
        unique_together = ('channel', 'user_id')


class Topic(models.Model):
    id = models.BigAutoField(primary_key=True)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    name = models.CharField(max_length=160)
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    message_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'topics'
        unique_together = ('channel', 'name')


class Message(models.Model):
    class ContentType(models.TextChoices):
        MARKDOWN = 'markdown'
        PLAIN = 'plain'

    id = models.BigAutoField(primary_key=True)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE)
    sender_id = models.UUIDField()
    content = models.TextField()
    content_type = models.CharField(max_length=20, choices=ContentType.choices, default=ContentType.MARKDOWN)
    attachments = models.JSONField(default=list)
    reactions = models.JSONField(default=dict)
    edited_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)
    search_vector = models.TextField(blank=True)

    class Meta:
        db_table = 'messages'
        indexes = [GinIndex(fields=['search_vector'], name='messages_search_gin')]


class DirectMessage(models.Model):
    id = models.BigAutoField(primary_key=True)
    org_id = models.UUIDField()
    participants = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'direct_messages'


class DMMessage(models.Model):
    id = models.BigAutoField(primary_key=True)
    dm = models.ForeignKey(DirectMessage, on_delete=models.CASCADE)
    sender_id = models.UUIDField()
    content = models.TextField()
    attachments = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'dm_messages'


class Notification(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.UUIDField()
    type = models.CharField(max_length=40)
    payload = models.JSONField(default=dict)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
