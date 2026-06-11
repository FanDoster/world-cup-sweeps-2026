-- ═══════════════════════════════════════
-- World Cup 2026 Sweepstakes — Schema v3
-- ═══════════════════════════════════════

DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS picks CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- ── TEAMS (48 teams, 12 groups) ────────

CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  group_letter CHAR(1) NOT NULL,
  iso TEXT,
  owner TEXT,
  win_pct INTEGER
);

INSERT INTO teams (name, group_letter, iso, owner, win_pct) VALUES
('Mexico','A','mx','Chris',62),('South Africa','A','za','Dan',19),
('South Korea','A','kr','Anton',47),('Czech Republic','A','cz','Anton',30),
('Canada','B','ca','Dan',47),('Bosnia & Herzegovina','B','ba','Steven',25),
('Qatar','B','qa','Pat',26),('Switzerland','B','ch','Chris',56),
('Brazil','C','br','Chris',73),('Morocco','C','ma','Laurie',57),
('Haiti','C','ht','Laurie',10),('Scotland','C','gb-sct','Laurie',29),
('United States','D','us','Dan',57),('Paraguay','D','py','Steven',21),
('Australia','D','au','Laurie',42),('Turkey','D','tr','Dan',34),
('Germany','E','de','Anton',75),('Curaçao','E','cw','Steven',14),
('Ivory Coast','E','ci','Anton',32),('Ecuador','E','ec','Pat',43),
('Netherlands','F','nl','Chris',69),('Japan','F','jp','Steven',46),
('Sweden','F','se','Steven',32),('Tunisia','F','tn','Pat',15),
('Belgium','G','be','Pat',72),('Egypt','G','eg','Chris',33),
('Iran','G','ir','Dan',47),('New Zealand','G','nz','Steven',13),
('Spain','H','es','Pat',78),('Cape Verde','H','cv','Laurie',13),
('Saudi Arabia','H','sa','Laurie',22),('Uruguay','H','uy','Anton',58),
('France','I','fr','Anton',81),('Senegal','I','sn','Chris',51),
('Iraq','I','iq','Chris',11),('Norway','I','no','Pat',29),
('Argentina','J','ar','Pat',84),('Algeria','J','dz','Laurie',29),
('Austria','J','at','Chris',44),('Jordan','J','jo','Anton',13),
('Portugal','K','pt','Laurie',74),('DR Congo','K','cd','Steven',16),
('Uzbekistan','K','uz','Pat',15),('Colombia','K','co','Steven',63),
('England','L','gb-eng','Anton',75),('Croatia','L','hr','Dan',62),
('Ghana','L','gh','Dan',19),('Panama','L','pa','Dan',14);

-- ── PICKS ──────────────────────────────

CREATE TABLE picks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  team_id INTEGER REFERENCES teams(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- ── MATCHES ────────────────────────────

CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  kickoff_time TIME NOT NULL,
  tz_offset INTEGER DEFAULT 0,
  home_team_id INTEGER REFERENCES teams(id),
  away_team_id INTEGER REFERENCES teams(id),
  group_letter CHAR(1),
  home_score INTEGER,
  away_score INTEGER,
  tv_channel TEXT,
  prob_home INTEGER,
  prob_draw INTEGER,
  prob_away INTEGER
);

-- Helper: insert one match by team names
CREATE OR REPLACE FUNCTION ins_match(
  md TEXT, kt TEXT, tz INT, ht TEXT, at TEXT, grp TEXT,
  hs INT, aws INT, tv TEXT, p1 INT, pd INT, p2 INT
) RETURNS VOID AS $$
DECLARE
  hid INT; aid INT;
BEGIN
  SELECT id INTO hid FROM teams WHERE name = ht;
  SELECT id INTO aid FROM teams WHERE name = at;
  INSERT INTO matches (match_date, kickoff_time, tz_offset, home_team_id, away_team_id, group_letter, home_score, away_score, tv_channel, prob_home, prob_draw, prob_away)
  VALUES (md::date, kt::time, tz, hid, aid, grp, hs, aws, tv, p1, pd, p2);
END;
$$ LANGUAGE plpgsql;

-- Group A
SELECT ins_match('2026-06-11','13:00',-6,'Mexico','South Africa','A',null,null,'ITV1',74,14,13);
SELECT ins_match('2026-06-11','20:00',-6,'South Korea','Czech Republic','A',null,null,'ITV1',52,23,24);
SELECT ins_match('2026-06-18','12:00',-4,'Czech Republic','Mexico','A',null,null,'BBC One',18,18,64);
SELECT ins_match('2026-06-18','19:00',-6,'South Africa','South Korea','A',null,null,'BBC Two',18,19,63);
SELECT ins_match('2026-06-24','19:00',-6,'Czech Republic','South Africa','A',null,null,'BBC One',47,25,27);
SELECT ins_match('2026-06-24','19:00',-6,'Mexico','South Korea','A',null,null,'BBC Two',48,25,27);
-- Group B
SELECT ins_match('2026-06-12','12:00',-4,'Canada','Bosnia & Herzegovina','B',null,null,'BBC One',56,22,22);
SELECT ins_match('2026-06-12','20:00',-4,'Qatar','Switzerland','B',null,null,'ITV1',19,20,61);
SELECT ins_match('2026-06-19','12:00',-4,'Switzerland','Canada','B',null,null,'ITV1',43,27,30);
SELECT ins_match('2026-06-19','19:00',-6,'Bosnia & Herzegovina','Qatar','B',null,null,'ITV4',34,29,37);
SELECT ins_match('2026-06-25','18:00',-6,'Switzerland','Bosnia & Herzegovina','B',null,null,'ITV1',63,19,18);
SELECT ins_match('2026-06-25','18:00',-6,'Canada','Qatar','B',null,null,'ITV1',54,23,23);
-- Group C
SELECT ins_match('2026-06-13','12:00',-4,'Brazil','Morocco','C',null,null,'BBC One',53,23,24);
SELECT ins_match('2026-06-13','16:00',-4,'Haiti','Scotland','C',null,null,'BBC One',19,19,62);
SELECT ins_match('2026-06-20','12:00',-4,'Scotland','Brazil','C',null,null,'BBC One',9,12,79);
SELECT ins_match('2026-06-20','16:00',-4,'Morocco','Haiti','C',null,null,'BBC Two',82,12,6);
SELECT ins_match('2026-06-26','18:00',-4,'Scotland','Morocco','C',null,null,'ITV1',16,17,66);
SELECT ins_match('2026-06-26','18:00',-4,'Brazil','Haiti','C',null,null,'ITV1',87,8,5);
-- Group D
SELECT ins_match('2026-06-12','12:00',-7,'United States','Paraguay','D',null,null,'BBC One',68,17,16);
SELECT ins_match('2026-06-12','19:00',-7,'Australia','Turkey','D',null,null,'ITV1',43,27,30);
SELECT ins_match('2026-06-20','12:00',-7,'Turkey','United States','D',null,null,'ITV1',22,22,56);
SELECT ins_match('2026-06-20','19:00',-7,'Paraguay','Australia','D',null,null,'ITV4',22,22,56);
SELECT ins_match('2026-06-26','18:00',-7,'Turkey','Paraguay','D',null,null,'ITV1',49,25,26);
SELECT ins_match('2026-06-26','18:00',-7,'United States','Australia','D',null,null,'BBC One',48,25,27);
-- Group E
SELECT ins_match('2026-06-13','12:00',-5,'Germany','Curaçao','E',null,null,'ITV1',81,11,7);
SELECT ins_match('2026-06-13','16:00',-5,'Ivory Coast','Ecuador','E',null,null,'ITV4',25,24,51);
SELECT ins_match('2026-06-21','12:00',-5,'Ecuador','Germany','E',null,null,'BBC One',13,14,73);
SELECT ins_match('2026-06-21','16:00',-5,'Curaçao','Ivory Coast','E',null,null,'BBC Two',11,13,76);
SELECT ins_match('2026-06-27','18:00',-5,'Ecuador','Curaçao','E',null,null,'ITV4',61,19,20);
SELECT ins_match('2026-06-27','18:00',-5,'Germany','Ivory Coast','E',null,null,'ITV1',66,17,17);
-- Group F
SELECT ins_match('2026-06-14','12:00',-5,'Netherlands','Japan','F',null,null,'BBC One',60,20,20);
SELECT ins_match('2026-06-14','19:00',-5,'Sweden','Tunisia','F',null,null,'ITV4',49,25,26);
SELECT ins_match('2026-06-22','12:00',-5,'Tunisia','Netherlands','F',null,null,'BBC One',9,11,80);
SELECT ins_match('2026-06-22','19:00',-5,'Japan','Sweden','F',null,null,'BBC Two',42,28,30);
SELECT ins_match('2026-06-28','18:00',-5,'Tunisia','Japan','F',null,null,'ITV4',18,20,62);
SELECT ins_match('2026-06-28','18:00',-5,'Netherlands','Sweden','F',null,null,'ITV1',62,20,18);
-- Group G
SELECT ins_match('2026-06-14','12:00',-5,'Belgium','Egypt','G',null,null,'BBC One',63,19,18);
SELECT ins_match('2026-06-14','19:00',-5,'Iran','New Zealand','G',null,null,'ITV4',65,18,17);
SELECT ins_match('2026-06-22','12:00',-5,'New Zealand','Belgium','G',null,null,'ITV1',8,10,82);
SELECT ins_match('2026-06-22','19:00',-5,'Egypt','Iran','G',null,null,'ITV4',26,25,49);
SELECT ins_match('2026-06-28','18:00',-5,'New Zealand','Egypt','G',null,null,'BBC One',11,14,75);
SELECT ins_match('2026-06-28','18:00',-5,'Belgium','Iran','G',null,null,'BBC Two',56,21,22);
-- Group H
SELECT ins_match('2026-06-15','12:00',-6,'Spain','Cape Verde','H',null,null,'BBC One',92,5,3);
SELECT ins_match('2026-06-15','19:00',-6,'Saudi Arabia','Uruguay','H',null,null,'ITV4',14,16,70);
SELECT ins_match('2026-06-23','12:00',-6,'Uruguay','Spain','H',null,null,'BBC One',15,16,69);
SELECT ins_match('2026-06-23','19:00',-6,'Cape Verde','Saudi Arabia','H',null,null,'BBC Two',32,28,40);
SELECT ins_match('2026-06-29','18:00',-6,'Uruguay','Cape Verde','H',null,null,'ITV4',80,12,8);
SELECT ins_match('2026-06-29','18:00',-6,'Spain','Saudi Arabia','H',null,null,'ITV1',83,10,7);
-- Group I
SELECT ins_match('2026-06-15','12:00',-6,'France','Senegal','I',null,null,'ITV1',68,17,15);
SELECT ins_match('2026-06-15','19:00',-6,'Iraq','Norway','I',null,null,'ITV4',10,12,78);
SELECT ins_match('2026-06-23','12:00',-6,'Norway','France','I',null,null,'ITV1',11,14,75);
SELECT ins_match('2026-06-23','19:00',-6,'Senegal','Iraq','I',null,null,'ITV4',83,10,7);
SELECT ins_match('2026-06-29','18:00',-6,'Norway','Senegal','I',null,null,'BBC One',17,20,63);
SELECT ins_match('2026-06-29','18:00',-6,'France','Iraq','I',null,null,'BBC Two',92,5,3);
-- Group J
SELECT ins_match('2026-06-16','12:00',-6,'Argentina','Algeria','J',null,null,'BBC One',81,11,8);
SELECT ins_match('2026-06-16','19:00',-6,'Austria','Jordan','J',null,null,'ITV4',74,15,11);
SELECT ins_match('2026-06-24','12:00',-6,'Jordan','Argentina','J',null,null,'ITV1',5,7,88);
SELECT ins_match('2026-06-24','19:00',-6,'Algeria','Austria','J',null,null,'ITV4',17,21,62);
SELECT ins_match('2026-06-30','18:00',-6,'Jordan','Algeria','J',null,null,'BBC One',9,12,79);
SELECT ins_match('2026-06-30','18:00',-6,'Argentina','Austria','J',null,null,'BBC Two',69,17,14);
-- Group K
SELECT ins_match('2026-06-16','12:00',-6,'Portugal','DR Congo','K',null,null,'ITV1',83,10,7);
SELECT ins_match('2026-06-16','19:00',-6,'Uzbekistan','Colombia','K',null,null,'ITV4',68,17,15);
SELECT ins_match('2026-06-24','12:00',-6,'Colombia','Portugal','K',null,null,'BBC One',15,17,68);
SELECT ins_match('2026-06-24','19:00',-6,'DR Congo','Uzbekistan','K',null,null,'BBC Two',30,27,43);
SELECT ins_match('2026-06-30','18:00',-6,'Colombia','DR Congo','K',null,null,'ITV4',49,25,26);
SELECT ins_match('2026-06-30','18:00',-6,'Portugal','Uzbekistan','K',null,null,'ITV1',63,19,18);
-- Group L
SELECT ins_match('2026-06-17','12:00',-6,'England','Croatia','L',null,null,'BBC One',52,24,24);
SELECT ins_match('2026-06-17','19:00',-6,'Ghana','Panama','L',null,null,'ITV4',53,23,24);
SELECT ins_match('2026-06-25','12:00',-6,'Panama','England','L',null,null,'ITV1',7,9,84);
SELECT ins_match('2026-06-25','19:00',-6,'Croatia','Ghana','L',null,null,'ITV4',63,19,18);
SELECT ins_match('2026-06-30','18:00',-6,'Panama','Croatia','L',null,null,'BBC One',8,10,82);
SELECT ins_match('2026-06-30','18:00',-6,'England','Ghana','L',null,null,'BBC Two',72,15,13);

DROP FUNCTION ins_match;

-- ── ROW LEVEL SECURITY ────────────────

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams_read" ON teams FOR SELECT USING (true);
CREATE POLICY "matches_read" ON matches FOR SELECT USING (true);
CREATE POLICY "picks_read" ON picks FOR SELECT USING (true);
CREATE POLICY "picks_insert" ON picks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "picks_delete" ON picks FOR DELETE USING (auth.uid() = user_id);
