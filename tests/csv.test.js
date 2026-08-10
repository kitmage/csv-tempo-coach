import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline, formatTime, parseCsv, parseTimestamp } from '../csv.js';
test('parses quoted commas and escaped quotes',()=>assert.deepEqual(parseCsv('a,b\n1,"hello, ""coach"""'),[['a','b'],['1','hello, "coach"']]));
test('supports MM:SS and HH:MM:SS',()=>{assert.equal(parseTimestamp('01:15'),75);assert.equal(parseTimestamp('1:02:03'),3723);assert.equal(parseTimestamp('abc'),null);});
test('validates and sorts a timeline',()=>{const result=buildTimeline('timestamp,bpm,text\n00:10,60,Later\n00:00,120,"Start, now"');assert.deepEqual(result.timeline.map(({time,bpm,text})=>({time,bpm,text})),[{time:0,bpm:120,text:'Start, now'},{time:10,bpm:60,text:'Later'}]);});
test('reports invalid rows and duplicate timestamps',()=>{assert.match(buildTimeline('timestamp,bpm,text\n00:00,900,no').errors[0],/20–300/);assert.equal(buildTimeline('timestamp,bpm,text\n00:00,100,a\n00:00,120,b').warnings.length,1);});
test('formats playback time',()=>{assert.equal(formatTime(75.9),'01:15');assert.equal(formatTime(3661),'01:01:01');});
