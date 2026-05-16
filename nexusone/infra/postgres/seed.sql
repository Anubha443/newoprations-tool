INSERT INTO nexus_core.organizations (id,name,slug,plan,settings) VALUES
('11111111-1111-1111-1111-111111111111','Demo Org','demo-org','pro','{}') ON CONFLICT DO NOTHING;
INSERT INTO nexus_core.users (id,email,password_hash,full_name,organization_id,roles,module_access,is_active) VALUES
('11111111-1111-1111-1111-111111111112','owner@demo.org','TEMP','Owner Demo','11111111-1111-1111-1111-111111111111',ARRAY['owner']::nexus_core.user_role[],'{"comm":true,"hrm":true,"crm":true}',true)
ON CONFLICT DO NOTHING;
