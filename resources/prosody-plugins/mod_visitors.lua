--- activate under main vhost
--- In /etc/hosts add:
--- vm1-ip-address visitors1.domain.com
--- vm1-ip-address conference.visitors1.domain.com
--- vm2-ip-address visitors2.domain.com
--- vm2-ip-address conference.visitors2.domain.com
--- Enable in global modules: 's2s_bidi' and 'certs_all'
--- Make sure 's2s' is not in modules_disabled
--- Open port 5269 on the provider side and on the firewall on the machine (iptables -I INPUT 4 -p tcp -m tcp --dport 5269 -j ACCEPT)
--- NOTE: Make sure all communication between prosodies is using the real jids ([foo]room1@muc.example.com)
local st = require 'util.stanza';
local jid = require 'util.jid';
local util = module:require 'util';
local presence_check_status = util.presence_check_status;

local um_is_admin = require 'core.usermanager'.is_admin;
local function is_admin(jid)
    return um_is_admin(jid, module.host);
end

local MUC_NS = 'http://jabber.org/protocol/muc';

-- required parameter for custom muc component prefix, defaults to 'conference'
local muc_domain_prefix = module:get_option_string('muc_mapper_domain_prefix', 'conference');

local main_muc_component_config = module:get_option_string('main_muc');
if main_muc_component_config == nil then
    module:log('error', 'visitors rooms not enabled missing main_muc config');
    return ;
end

-- A list of domains which to be ignored for visitors. For occupants using those domain we do not propagate them
-- to visitor nodes and we do not update them with presence changes
local ignore_list = module:get_option_set('visitors_ignore_list', {});

-- Advertise the component for discovery via disco#items
module:add_identity('component', 'visitors', 'visitors.'..module.host);

-- visitors_nodes = {
--  roomjid1 = {
--    nodes = {
--      ['conference.visitors1.jid'] = 2, // number of main participants, on 0 we clean it
--      ['conference.visitors2.jid'] = 3
--    }
--  },
--  roomjid2 = {}
--}
local visitors_nodes = {};

-- an event received from visitors component, which receives iqs from jicofo
local function connect_vnode(event)
    local room, vnode = event.room, event.vnode;
    local conference_service = muc_domain_prefix..'.'..vnode..'.meet.jitsi';

    if visitors_nodes[room.jid] and
        visitors_nodes[room.jid].nodes and
        visitors_nodes[room.jid].nodes[conference_service] then
        -- nothing to do
        return;
    end

    if visitors_nodes[room.jid] == nil then
        visitors_nodes[room.jid] = {};
    end
    if visitors_nodes[room.jid].nodes == nil then
        visitors_nodes[room.jid].nodes = {};
    end

    local sent_main_participants = 0;

    for _, o in room:each_occupant() do
        if not is_admin(o.bare_jid) then
            local fmuc_pr = st.clone(o:get_presence());
            local user, _, res = jid.split(o.nick);
            fmuc_pr.attr.to = jid.join(user, conference_service , res);
            fmuc_pr.attr.from = o.jid;
            -- add <x>
            fmuc_pr:tag('x', { xmlns = MUC_NS }):up();

            module:send(fmuc_pr);

            sent_main_participants = sent_main_participants + 1;
        end
    end
    visitors_nodes[room.jid].nodes[conference_service] = sent_main_participants;
end
module:hook('jitsi-connect-vnode', connect_vnode);

-- an event received from visitors component, which receives iqs from jicofo
local function disconnect_vnode(event)
    local room, vnode = event.room, event.vnode;
    local conference_service = muc_domain_prefix..'.'..vnode..'.meet.jitsi';

    -- we are counting vnode main participants and we should be clearing it there
    -- let's do it here just in case
    visitors_nodes[room.jid].nodes[conference_service] = nil;
end
module:hook('jitsi-disconnect-vnode', disconnect_vnode);

-- takes care when the visitor nodes destroys the room to count the leaving participants from there, and if its really destroyed
-- we clean up, so if we establish again the connection to the same visitor node to send the main participants
module:hook('presence/full', function(event)
    local stanza = event.stanza;
    local room_name, from_host = jid.split(stanza.attr.from);
    if stanza.attr.type == 'unavailable' and from_host ~= main_muc_component_config then
        local room_jid = jid.join(room_name, main_muc_component_config); -- converts from visitor to main room jid

        local x = stanza:get_child('x', 'http://jabber.org/protocol/muc#user');
        if not presence_check_status(x, '110') then
            return;
        end

        if visitors_nodes[room_jid] and visitors_nodes[room_jid].nodes
                and visitors_nodes[room_jid].nodes[from_host] then
            visitors_nodes[room_jid].nodes[from_host] = visitors_nodes[room_jid].nodes[from_host] - 1;
            if visitors_nodes[room_jid].nodes[from_host] == 0 then
                visitors_nodes[room_jid].nodes[from_host] = nil;
            end
        end
    end
end, 900);

-- process a host module directly if loaded or hooks to wait for its load
function process_host_module(name, callback)
    local function process_host(host)
        if host == name then
            callback(module:context(host), host);
        end
    end

    if prosody.hosts[name] == nil then
        module:log('debug', 'No host/component found, will wait for it: %s', name)

        -- when a host or component is added
        prosody.events.add_handler('host-activated', process_host);
    else
        process_host(name);
    end
end

process_host_module(main_muc_component_config, function(host_module, host)
    -- detects presence change in a main participant and propagate it to the used visitor nodes
    host_module:hook('muc-occupant-pre-change', function (event)
        local room, stanza, occupant = event.room, event.stanza, event.dest_occupant;

        -- filter focus and configured domains (used for jibri and transcribers)
        if is_admin(stanza.attr.from) or visitors_nodes[room.jid] == nil
            or ignore_list:contains(jid.host(occupant.bare_jid)) then
            return;
        end

        local vnodes = visitors_nodes[room.jid].nodes;
        local user, _, res = jid.split(occupant.nick);
        -- a change in the presence of a main participant we need to update all active visitor nodes
        for k in pairs(vnodes) do
            local fmuc_pr = st.clone(stanza);
            fmuc_pr.attr.to = jid.join(user, k, res);
            fmuc_pr.attr.from = occupant.jid;
            module:send(fmuc_pr);
        end
    end);

    -- when a main participant leaves inform the visitor nodes
    host_module:hook('muc-occupant-left', function (event)
        local room, stanza, occupant = event.room, event.stanza, event.occupant;

        -- ignore configured domains (jibri and transcribers)
        if is_admin(occupant.bare_jid) or visitors_nodes[room.jid] == nil or visitors_nodes[room.jid].nodes == nil
            or ignore_list:contains(jid.host(occupant.bare_jid)) then
            return;
        end

        -- we want to update visitor node that a main participant left
        if stanza then
            local vnodes = visitors_nodes[room.jid].nodes;
            local user, _, res = jid.split(occupant.nick);
            for k in pairs(vnodes) do
                local fmuc_pr = st.clone(stanza);
                fmuc_pr.attr.to = jid.join(user, k, res);
                fmuc_pr.attr.from = occupant.jid;
                module:send(fmuc_pr);
            end
        else
            module:log('warn', 'No unavailable stanza found ... leak participant on visitor');
        end
    end);

    -- cleanup cache
    host_module:hook('muc-room-destroyed',function(event)
        visitors_nodes[event.room.jid] = nil;
    end);

    -- detects new participants joining main room and sending them to the visitor nodes
    host_module:hook('muc-occupant-joined', function (event)
        local room, stanza, occupant = event.room, event.stanza, event.occupant;

        -- filter focus, ignore configured domains (jibri and transcribers)
        if is_admin(stanza.attr.from) or visitors_nodes[room.jid] == nil
            or ignore_list:contains(jid.host(occupant.bare_jid)) then
            return;
        end

        local vnodes = visitors_nodes[room.jid].nodes;
        local user, _, res = jid.split(occupant.nick);
        -- a main participant we need to update all active visitor nodes
        for k in pairs(vnodes) do
            local fmuc_pr = st.clone(stanza);
            fmuc_pr.attr.to = jid.join(user, k, res);
            fmuc_pr.attr.from = occupant.jid;
            module:send(fmuc_pr);
        end
    end);
    -- forwards messages from main participants to vnodes
    host_module:hook("muc-occupant-groupchat", function(event)
        local room, stanza, occupant = event.room, event.stanza, event.occupant;

        -- filter sending messages from transcribers/jibris to visitors
        if not visitors_nodes[room.jid] or ignore_list:contains(jid.host(occupant.bare_jid)) then
            return;
        end

        local vnodes = visitors_nodes[room.jid].nodes;
        local user = jid.node(occupant.nick);
        -- a main participant we need to update all active visitor nodes
        for k in pairs(vnodes) do
            local fmuc_msg = st.clone(stanza);
            fmuc_msg.attr.to = jid.join(user, k);
            fmuc_msg.attr.from = occupant.jid;
            module:send(fmuc_msg);
        end
    end);
    -- receiving messages from visitor nodes and forward them to local main participants
    -- and forward them to the rest of visitor nodes
    host_module:hook("muc-occupant-groupchat", function(event)
        local occupant, room, stanza = event.occupant, event.room, event.stanza;
        local to = stanza.attr.to;
        local from = stanza.attr.from;
        local from_vnode = jid.host(from);

        if occupant or not (visitors_nodes[to] or visitors_nodes[to].nodes[from_vnode]) then
            return;
        end

        -- a message from visitor occupant of known visitor node
        stanza.attr.from = to;
        for _, o in room:each_occupant() do
            -- send it to the nick to be able to route it to the room (ljm multiple rooms) from unknown occupant
            room:route_to_occupant(o, stanza);
        end

        -- now we need to send to rest of visitor nodes
        local vnodes = visitors_nodes[room.jid].nodes;
        for k in pairs(vnodes) do
            if k ~= from_vnode then
                local st_copy = st.clone(stanza);
                st_copy.attr.to = jid.join(jid.node(room.jid), k);
                module:send(st_copy);
            end
        end

        return true;
    end, 55); -- prosody check for unknown participant chat is prio 50, we want to override it
end);
