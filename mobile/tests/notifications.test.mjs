import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotifications } from '../src/notifications.ts';
const content={heroTitle:'Home',heroDescription:'Intro',announcementEnabled:true,announcementTitle:'Office notice',announcementBody:'Closed Friday',supportEmail:'',supportPhone:''};
const application={id:'a',customerId:'u',jobId:'j',jobTitle:'Driver',company:'Employer',status:'Submitted',createdAt:'2026-09-16'};
test('hidden or incomplete announcements do not create notifications',()=>{
 assert.equal(buildNotifications({...content,announcementEnabled:false},[]).length,0);
 assert.equal(buildNotifications({...content,announcementBody:''},[]).length,0);
});
test('only changes to announcement text or application status create a new unread identity',()=>{
 const original=buildNotifications(content,[application]);
 const read=new Set(original.map(n=>n.id));
 assert.equal(buildNotifications({...content,heroTitle:'Another title'},[application]).filter(n=>!read.has(n.id)).length,0);
 const changed=buildNotifications({...content,announcementBody:'Closed Monday'},[{...application,status:'Shortlisted'}]);
 assert.equal(changed.filter(n=>!read.has(n.id)).length,2);
 assert.deepEqual(changed.map(n=>n.destination),['home','profile']);
});
test('guest notifications exclude account updates when no applications are supplied',()=>{
 assert.equal(buildNotifications(content,[]).length,1);
});
