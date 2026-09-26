هسته قبلی بازی مافیا رو حذف کن و این که بهت میدم رو جایگزین کن

بازی مافیا فقط به صورت آنلاین باید بشه بازی کرد و حالت تک نفره رو حذف کن:

تو باید هسته فعلی بازی «مافیای بهسازانی» را به یک بازی واقعی، پایدار و قابل اجرا به‌صورت **Real-Time Online Multiplayer** تبدیل کنی.

این پروژه بخشی از اپلیکیشن «میدان هم‌تیمی‌ها» برای همکاران شرکت بهسازان ملت است.

این دستور فقط برای طراحی ظاهری نیست.

باید هم‌زمان این موارد را بررسی، بازطراحی و در معماری محصول لحاظ کنی:

Game Core
Game State Machine
Role System
Multiplayer Architecture
Client Isolation
Server Authority
Real-Time Synchronization
Private/Public Information
Night/Day Logic
Voting Engine
Timer Engine
Win/Lose Conditions
Reconnection
Disconnect Handling
Anti-Cheat / Validation
Error Handling
UX Flow
Animation State
Accessibility
Performance
QA / Scenario Testing
Versioning
Admin Monitoring
Game Integrity

━━━━━━━━━━━━━━━━━━━━
بخش 1 — اصل اساسی بازی
━━━━━━━━━━━━━━━━━━━━

«مافیای بهسازانی» باید یک بازی Multiplayer واقعی باشد.

هر بازیکن باید با دستگاه/کلاینت مستقل خودش وارد اتاق شود.

مثلاً اگر 10 بازیکن داخل یک اتاق باشند:

Player A → Client A
Player B → Client B
Player C → Client C
...
Player J → Client J

هیچ‌کدام نباید UI یا اطلاعات خصوصی بازیکن دیگر را دریافت کنند.

بازی نباید مانند نسخه فعلی به شکل Single Device اجرا شود.

هر بازیکن باید:

* نقش خودش را ببیند.
* اطلاعات مجاز خودش را ببیند.
* اقدامات مجاز خودش را انجام دهد.
* رأی خودش را ثبت کند.
* تایمر خودش را دریافت کند.
* وضعیت عمومی بازی را ببیند.
* پیام‌های خصوصی خودش را دریافت کند.

اما نباید:

* نقش مخفی دیگران را ببیند.
* Action خصوصی دیگران را ببیند.
* نتیجه Investigation دیگران را ببیند.
* Target انتخاب‌شده توسط Mafia را قبل از زمان مجاز ببیند.
* رأی ثبت‌نشده دیگران را ببیند.
* State داخلی سرور را مشاهده کند.

اصل کلیدی:

SERVER-AUTHORITATIVE GAME

سرور مرجع نهایی Game State باشد.

Client فقط درخواست Action ارسال کند.

نمونه:

Client:
"Player 07 wants to investigate Player 04"

Server:

* آیا Player 07 زنده است؟
* آیا نقش Player 07 اجازه Investigation دارد؟
* آیا اکنون Night Phase است؟
* آیا Action قبلاً استفاده شده؟
* آیا Player 04 Target معتبر است؟
* آیا درخواست متعلق به همان Player Session است؟

اگر همه معتبر بودند:
Action ثبت شود.

اگر معتبر نبود:
Action رد شود و Client پیام مناسب دریافت کند.

هرگز اجازه نده Client به‌صورت مستقیم Game State را تغییر دهد.

━━━━━━━━━━━━━━━━━━━━
بخش 2 — بازی نباید Fake Multiplayer باشد
━━━━━━━━━━━━━━━━━━━━

اگر Backend/Realtime Server واقعی در محیط Figma Make در دسترس نیست:

به هیچ عنوان وانمود نکن که Multiplayer واقعی ساخته شده است.

در این حالت:

Transport Layer را abstraction کن.
Interface مشخص برای WebSocket/Realtime ایجاد کن.
Mock Transport برای تست UI ایجاد کن.
State Synchronization را از UI جدا کن.
Server-authoritative model را حفظ کن.
بعداً بتوان Backend واقعی را بدون بازنویسی UI جایگزین کرد.

معماری باید قابلیت اتصال به:

WebSocket / Socket.IO / Supabase Realtime / Firebase / WebRTC signaling / Backend اختصاصی

را داشته باشد.

اما Figma Make نباید ادعا کند که Mock همان Multiplayer واقعی است.

━━━━━━━━━━━━━━━━━━━━
بخش 3 — ساختار کلی بازی
━━━━━━━━━━━━━━━━━━━━

بازی از این Stateها تشکیل شود:

LOBBY
↓
PLAYER_READY
↓
ROLE_ASSIGNMENT
↓
ROLE_REVEAL
↓
FIRST_NIGHT
↓
DAY_DISCUSSION
↓
DAY_VOTING
↓
VOTE_RESULT
↓
NIGHT
↓
NIGHT_ACTIONS
↓
NIGHT_RESOLUTION
↓
MORNING
↓
WIN_CHECK
↓
NEXT_ROUND
↓
END_GAME

در هر Transition:

* فقط Server اجازه تغییر State داشته باشد.
* همه Clientها Event جدید را دریافت کنند.
* Client فقط View مناسب State خودش را Render کند.

━━━━━━━━━━━━━━━━━━━━
بخش 4 — Lobby
━━━━━━━━━━━━━━━━━━━━

Host:

* ایجاد اتاق
* مشاهده Room Code
* مشاهده بازیکنان
* مشاهده Ready Status
* انتخاب تعداد بازیکنان
* مشاهده Role Setup
* شروع بازی

Joiner:

* ورود با Room Code
* انتخاب نام نمایشی
* انتخاب Avatar
* مشاهده بازیکنان حاضر
* Ready / Not Ready

هیچ بازیکنی قبل از شروع بازی نباید Role را بداند.

Host نیز نباید Roleها را قبل از شروع مشاهده کند، مگر اینکه سیستم صراحتاً برای حالت Moderator/Admin طراحی شده باشد.

━━━━━━━━━━━━━━━━━━━━
بخش 5 — تعداد بازیکنان
━━━━━━━━━━━━━━━━━━━━

حداقل پیشنهادی:

7 بازیکن

حالت‌های اصلی:

7–8
9–10
11–12
13–15

برای هر Player Count، Role Configuration جداگانه داشته باش.

Role Distribution را Hard-code نکن.

مثلاً:

7 Player:

* Mafia × 2
* Detective × 1
* Doctor × 1
* Citizen × 3

8 Player:

* Mafia × 2
* Detective × 1
* Doctor × 1
* Citizen × 4

9–10:

* Mafia × 2 یا 3
* Detective × 1
* Doctor × 1
* Citizen باقی‌مانده

11–12:

* Mafia × 3
* Detective × 1
* Doctor × 1
* Citizen باقی‌مانده

13–15:

* Mafia × 3 یا 4
* Detective × 1
* Doctor × 1
* Citizen / Special Town باقی‌مانده

Role Balance Engine داشته باش.

هیچ Role جدیدی نباید بدون بررسی Balance وارد Setup شود.

━━━━━━━━━━━━━━━━━━━━
بخش 6 — هویت بازی
━━━━━━━━━━━━━━━━━━━━

نام:

«مافیای بهسازانی»

Theme:

یک بحران ساختگی در یک شرکت فناوری/بانکی.

بازیکنان اعضای یک تیم سازمانی هستند که در ظاهر برای حل یک بحران همکاری می‌کنند، اما یک تیم مخفی در حال ایجاد اختلال است.

به جای Mafia سنتی با فضای جنایی خشن، روایت را به شکل Corporate Mystery / Digital Investigation طراحی کن.

فضای بازی:

* اتاق بحران
* داشبورد دیجیتال
* پروژه
* سامانه
* تیم‌های تخصصی
* جلسات
* رخدادهای مشکوک
* سرنخ
* گزارش
* دسترسی
* Incident
* Investigation
* تصمیم‌گیری

از استفاده افراطی از واژه‌های جنایی، اسلحه و خشونت تصویری خودداری کن.

━━━━━━━━━━━━━━━━━━━━
بخش 7 — تیم‌ها
━━━━━━━━━━━━━━━━━━━━

TEAM A — «تیم سازمان»

هدف:

شناسایی تمام اعضای تیم خرابکار و حذف آن‌ها از بازی.

TEAM B — «تیم سایه»

هدف:

پنهان ماندن، ایجاد اختلال و رسیدن به برابری عددی با تیم سازمان.

نکته:

اسم «مافیا» می‌تواند در عنوان بازی باقی بماند، اما داخل روایت از واژگان Corporate Mystery استفاده کن.

━━━━━━━━━━━━━━━━━━━━
بخش 8 — نقش‌های اصلی
━━━━━━━━━━━━━━━━━━━━

ROLE 1 — شهروند بهسازانی

نام نمایشی:

«همکار»

Alignment:
TEAM ORGANIZATION

Ability:
هیچ Action شبانه خاصی ندارد.

توانایی واقعی او:

* مشاهده اطلاعات عمومی
* مشارکت در Discussion
* رأی‌دادن
* تحلیل رفتار دیگران

UI:

«امشب مأموریت ویژه‌ای نداری.
سرنخ‌ها را جمع کن و به تصمیم تیم کمک کن.»

━━━━━━━━━━━━━━━━━━━━
ROLE 2 — مافیا

نام پیشنهادی:

«عضو تیم سایه»

Alignment:
SHADOW TEAM

Abilities:

* دیدن اعضای تیم سایه
* مشارکت در تصمیم Night Target
* مشاهده وضعیت زنده اعضای تیم سایه
* مشارکت در Discussion روز

اطلاعات خصوصی:

فقط Mafia اعضای Mafia را ببینند.

Citizen نباید بداند چه کسی Mafia است.

━━━━━━━━━━━━━━━━━━━━
ROLE 3 — کارآگاه

نام:

«تحلیلگر امنیت»

Alignment:
TEAM ORGANIZATION

Night Ability:

هر شب یک Player را بررسی کند.

نتیجه فقط برای خودش نمایش داده شود.

مثلاً:

«نتیجه بررسی:
این بازیکن عضو تیم سایه است.»

یا:

«این بازیکن عضو تیم سازمان است.»

نتیجه هرگز Broadcast نشود.

━━━━━━━━━━━━━━━━━━━━
ROLE 4 — پزشک

نام:

«مسئول تداوم خدمت»

Alignment:
TEAM ORGANIZATION

هر شب یک Player را Protect کند.

اگر Mafia همان Player را Target کرده باشد:

Kill → Cancel

قانون:

به‌صورت پیش‌فرض نمی‌تواند یک Player را دو شب متوالی Protect کند.

این Rule باید Configurable باشد.

━━━━━━━━━━━━━━━━━━━━
ROLE 5 — دون

نام:

«رهبر تیم سایه»

Alignment:
SHADOW TEAM

Abilities:

* مشاهده اعضای تیم سایه
* مشارکت در انتخاب Target
* Investigation محدود

Action:

هر شب می‌تواند یک Player را بررسی کند تا مشخص شود آیا آن Player «تحلیلگر امنیت» است یا خیر.

نتیجه فقط برای Don نمایش داده شود.

━━━━━━━━━━━━━━━━━━━━
ROLE 6 — نقش ویژه اختیاری
━━━━━━━━━━━━━━━━━━━━

برای نسخه‌های Advanced:

«بازرس ارشد»

یا

«مدیر بحران»

این Role را فقط در Matchهای بالاتر از 10 بازیکن فعال کن.

اما تا زمانی که Balance آن تست نشده، Default نباشد.

━━━━━━━━━━━━━━━━━━━━
بخش 9 — Role Assignment
━━━━━━━━━━━━━━━━━━━━

هنگام Start:

Server باید:

لیست بازیکنان را دریافت کند.
Setup مناسب را انتخاب کند.
Roleها را ایجاد کند.
Roleها را به‌صورت Cryptographically Secure Random تخصیص دهد.
Role Assignment را در Server State ذخیره کند.
برای هر Client فقط Role خودش را ارسال کند.

هرگز:

کل Role Map را به Client ارسال نکن.

حتی اگر UI آن را نمایش نمی‌دهد.

━━━━━━━━━━━━━━━━━━━━
بخش 10 — Role Reveal
━━━━━━━━━━━━━━━━━━━━

هر Player صفحه مخصوص خودش را ببیند:

* Avatar
* Role Name
* Team
* Ability
* Objective
* First instruction

Role Reveal:

2–4 ثانیه

سپس:

«متوجه شدم»

بعد از تأیید همه بازیکنان:

Game وارد Phase بعد شود.

اگر یک Player تأیید نکرد:

Timer داشته باش.

━━━━━━━━━━━━━━━━━━━━
بخش 11 — First Night
━━━━━━━━━━━━━━━━━━━━

Night اول برای شناخت تیم سایه استفاده شود.

اعضای Shadow Team فقط اعضای تیم خودشان را ببینند.

مثلاً:

«اعضای تیم سایه:

بازیکن 02
بازیکن 05
بازیکن 08»

هیچ اطلاعات دیگری نمایش داده نشود.

اگر Setup نیاز به First Night Kill ندارد:

First Night = Coordination Only

بعد:

DAY 1

━━━━━━━━━━━━━━━━━━━━
بخش 12 — Day Phase
━━━━━━━━━━━━━━━━━━━━

Day شامل:

MORNING
↓
DISCUSSION
↓
NOMINATION
↓
DEFENSE
↓
FINAL VOTE
↓
RESULT

━━━━━━━━━━━━━━━━━━━━
بخش 13 — Morning
━━━━━━━━━━━━━━━━━━━━

Server نتیجه Night را محاسبه کند.

اگر کسی کشته شده:

برای همه:

«صبح یک روز تازه آغاز شده...
اما یکی از هم‌تیمی‌ها دیگر در جلسه حضور ندارد.»

سپس Player از Active Players خارج شود.

اگر کسی نجات پیدا کرده:

به‌صورت پیش‌فرض فقط اعلام شود:

«دیشب اتفاقی افتاد، اما کسی از بازی خارج نشد.»

اطلاعات Protect نباید Leak شود.

━━━━━━━━━━━━━━━━━━━━
بخش 14 — Discussion
━━━━━━━━━━━━━━━━━━━━

Discussion باید واقعاً Multiplayer باشد.

هر بازیکن مستقل:

* Speaker State
* Timer
* Turn
* Remaining Time
* Skip
* Connection Status

را ببیند.

Speaker Order توسط Server تعیین شود.

مثلاً:

Player 01
↓
Player 02
↓
Player 03
↓
...

هیچ Client نباید Speaker بعدی را تغییر دهد.

Default:

45–60 ثانیه برای هر بازیکن.

Timer Server-authoritative باشد.

Client Timer فقط نمایش‌دهنده باشد.

━━━━━━━━━━━━━━━━━━━━
بخش 15 — Voting
━━━━━━━━━━━━━━━━━━━━

پس از Discussion:

Vote Phase شروع شود.

هر Player زنده:

یک Vote دارد.

UI:

لیست بازیکنان زنده

برای هر Player:

* Avatar
* Name
* وضعیت زنده
* انتخاب

بازیکن نمی‌تواند:

* خودش را انتخاب کند.
* بازیکن مرده را انتخاب کند.
* بیش از یک Vote ثبت کند.

Vote باید Server-side Validation شود.

━━━━━━━━━━━━━━━━━━━━
بخش 16 — Vote Privacy
━━━━━━━━━━━━━━━━━━━━

قبل از پایان Voting:

هیچ بازیکنی نباید بداند چه کسی به چه کسی رأی داده است.

به جای Vote Result Live:

نمایش:

«7 از 9 بازیکن رأی خود را ثبت کرده‌اند.»

بعد از پایان:

Result Broadcast شود.

مثلاً:

Player 04 → 4 votes
Player 07 → 3 votes
Player 02 → 2 votes

سپس:

Player 04 eliminated.

━━━━━━━━━━━━━━━━━━━━
بخش 17 — Tie
━━━━━━━━━━━━━━━━━━━━

اگر دو بازیکن بیشترین رأی برابر داشتند:

Tie State

→ نمایش دو کاندیدا

→ Defense کوتاه

→ Revote

اگر Revote هم مساوی شد:

No Elimination

سپس:

Night

این Rule باید کاملاً Server-side باشد.

━━━━━━━━━━━━━━━━━━━━
بخش 18 — Night Phase
━━━━━━━━━━━━━━━━━━━━

هر Role فقط Action خودش را ببیند.

مثلاً Mafia:

«هدف شب را انتخاب کنید.»

فقط:

Alive Players

قابل انتخاب باشند.

Doctor:

«چه کسی را برای حفظ تداوم خدمت انتخاب می‌کنید؟»

Detective:

«چه کسی را بررسی می‌کنید؟»

Don:

«چه کسی را بررسی می‌کنید؟»

━━━━━━━━━━━━━━━━━━━━
بخش 19 — Mafia Coordination
━━━━━━━━━━━━━━━━━━━━

این بخش بسیار مهم است.

اگر 3 Mafia وجود دارد:

هر Mafia یک Client جدا دارد.

هر سه باید بتوانند Target پیشنهادی را مشاهده کنند.

اما Target نهایی فقط زمانی ثبت شود که:

* Mafiaهای مورد نیاز Vote کنند
  یا
* Deadline تمام شود.

مثلاً:

Mafia A → Player 04
Mafia B → Player 04
Mafia C → Player 07

Server:

04 = 2 votes
07 = 1 vote

Target = Player 04

هیچ Client نباید Target را خودش تعیین کند.

━━━━━━━━━━━━━━━━━━━━
بخش 20 — Night Action Resolution
━━━━━━━━━━━━━━━━━━━━

Server باید Actionها را در یک ترتیب deterministic پردازش کند.

نمونه:

Validate players
Check alive/dead
Apply investigation
Apply protection
Resolve Mafia target
Resolve kill
Resolve other effects
Generate public events
Generate private events
Check win condition
Transition to MORNING

تمامی Eventها دارای:

eventId
gameId
roundId
phase
serverTimestamp
sequenceNumber

باشند.

━━━━━━━━━━━━━━━━━━━━
بخش 21 — اطلاعات عمومی و خصوصی
━━━━━━━━━━━━━━━━━━━━

سه سطح State تعریف کن:

PUBLIC STATE

قابل مشاهده برای همه:

* Player names
* Avatar
* Alive/dead
* Current phase
* Timer
* Vote result after reveal
* Public announcements

PRIVATE STATE

فقط برای Player:

* Role
* Team
* Investigation result
* Private notifications
* Personal action status

FACTION STATE

فقط برای اعضای یک Team:

* Mafia teammates
* Mafia coordination
* Team target proposals
* Team status

هر State باید Permission داشته باشد.

━━━━━━━━━━━━━━━━━━━━
بخش 22 — Dead Player
━━━━━━━━━━━━━━━━━━━━

بعد از Elimination:

Player تبدیل شود به:

SPECTATOR

اما:

* Vote ندارد.
* Action ندارد.
* Discussion
ندارد.
* اطلاعات جدید خصوصی دریافت نمی‌کند.
* نمی‌تواند به بازیکنان زنده پیام بدهد.

Spectator فقط Public State را ببیند.

در UI:

«شما از بازی خارج شده‌اید.»

سپس:

«تماشای ادامه بازی»

━━━━━━━━━━━━━━━━━━━━
بخش 23 — Win Conditions
━━━━━━━━━━━━━━━━━━━━

بعد از هر:

Kill
Vote Elimination
Night Resolution

Server باید Win Check اجرا کند.

TEAM ORGANIZATION WINS:

اگر تمام Shadow Team حذف شده باشند.

SHADOW TEAM WINS:

اگر تعداد اعضای زنده Shadow Team به تعداد تمام سایر بازیکنان زنده برسد یا از آن عبور کند.

هیچ Client نباید Win را محاسبه کند.

Server باید:

GAME_OVER

Event ارسال کند.

━━━━━━━━━━━━━━━━━━━━
بخش 24 — پایان بازی
━━━━━━━━━━━━━━━━━━━━

End Screen:

* Winner Team
* Game Duration
* Number of Rounds
* Players
* Final Roles
* Key Events
* MVP

MVP نباید صرفاً بر اساس Winner بودن تعیین شود.

Metrics:

* Survival
* Correct Investigation
* Successful Protection
* Mafia Target Accuracy
* Vote Accuracy
* Participation
* Team Contribution

اما امتیازها باید صرفاً برای Gamification باشند و نباید نتیجه اصلی بازی را تغییر دهند.

━━━━━━━━━━━━━━━━━━━━
بخش 25 — Gamification
━━━━━━━━━━━━━━━━━━━━

برای فضای «میدان هم‌تیمی‌ها»:

Achievementهای سازمانی طراحی کن:

«تحلیلگر دقیق»
«نجات در لحظه»
«ردیابی سایه»
«تصمیم‌گیر سریع»
«آخرین بازمانده»
«جلسه‌گردان حرفه‌ای»
«هم‌تیمی وفادار»
«استاد استدلال»
«نفوذی بی‌صدا»

از اصطلاحات تحقیرآمیز برای بازیکنان بازنده استفاده نکن.

━━━━━━━━━━━━━━━━━━━━
بخش 26 — Realtime Architecture
━━━━━━━━━━━━━━━━━━━━

Architecture:

Client
↓
Realtime Transport
↓
Game Server
↓
Authoritative Game State
↓
Event Dispatcher
↓
Per-Player State Filter
↓
Client

Game State شامل:

gameId
roomId
phase
round
players
roles
alivePlayers
votes
nightActions
timers
events
winner
version
sequenceNumber

باشد.

━━━━━━━━━━━━━━━━━━━━
بخش 27 — Event Model
━━━━━━━━━━━━━━━━━━━━

Eventهای اصلی:

ROOM_CREATED
PLAYER_JOINED
PLAYER_READY
GAME_STARTED
ROLE_ASSIGNED
ROLE_REVEALED
NIGHT_STARTED
FACTION_REVEALED
ACTION_AVAILABLE
ACTION_SUBMITTED
ACTION_REJECTED
DISCUSSION_STARTED
PLAYER_TURN_STARTED
PLAYER_TURN_ENDED
VOTING_STARTED
VOTE_SUBMITTED
VOTING_ENDED
TIE_DETECTED
REVOTE_STARTED
PLAYER_ELIMINATED
NIGHT_RESOLVED
MORNING_STARTED
WIN_DETECTED
GAME_ENDED
PLAYER_DISCONNECTED
PLAYER_RECONNECTED
GAME_PAUSED
GAME_RESUMED
ERROR

━━━━━━━━━━━━━━━━━━━━
بخش 28 — Sequence Number
━━━━━━━━━━━━━━━━━━━━

هر Event باید sequenceNumber داشته باشد.

Client:

lastSequenceNumber

را نگه دارد.

اگر:

sequenceNumber = 105

دریافت شد و Client منتظر 104 بود:

Event معتبر است.

اگر 103 رسید:

Duplicate / Old Event

نادیده گرفته شود.

اگر 105 دریافت شد در حالی که Client منتظر 104 بود:

Gap Detected

Client باید:

STATE_RESYNC

درخواست کند.

━━━━━━━━━━━━━━━━━━━━
بخش 29 — Reconnection
━━━━━━━━━━━━━━━━━━━━

اگر اینترنت Player قطع شد:

Game متوقف نشود.

Player:

DISCONNECTED

شود.

Grace Period:

حداقل 30–60 ثانیه.

اگر برگشت:

RECONNECTED

Server باید:

Current State Snapshot

را ارسال کند.

بازیکن نباید Role یا Private Data خود را از دست بدهد.

اگر در زمان Disconnect یک Action معتبر قابل انجام بوده:

Action باید طبق Rule همان Phase تعیین تکلیف شود.

━━━━━━━━━━━━━━━━━━━━
بخش 30 — Late Join
━━━━━━━━━━━━━━━━━━━━

بعد از شروع بازی:

JOIN ممنوع.

کاربر فقط می‌تواند:

Spectator

باشد، اگر Rule بازی اجازه دهد.

هرگز اجازه نده یک بازیکن جدید وسط بازی Role دریافت کند.

━━━━━━━━━━━━━━━━━━━━
بخش 31 — Network Failure
━━━━━━━━━━━━━━━━━━━━

سناریوها را تست کن:

Player disconnect during Lobby
Player disconnect during Role Reveal
Player disconnect during Discussion
Player disconnect during Vote
Player disconnect during Mafia Night
Player disconnect during Investigation
Player disconnect during Protection
Player reconnect before deadline
Player reconnect after deadline
Host disconnect
Server reconnect
Duplicate action
Delayed action
Old action
Invalid action

برای هرکدام UX مناسب طراحی کن.

━━━━━━━━━━━━━━━━━━━━
بخش 32 — Host Failure
━━━━━━━━━━━━━━━━━━━━

Host نباید مالک Game State باشد.

اگر Host Disconnect شد:

Game Server باید همچنان Game را ادامه دهد.

در صورت نیاز:

Host Migration

انجام شود.

Player جدید Host شود.

اما Roleها و State بازی تغییر نکنند.

━━━━━━━━━━━━━━━━━━━━
بخش 33 — Anti Cheat
━━━━━━━━━━━━━━━━━━━━

Client نباید بتواند:

* Role خودش را تغییر دهد.
* Role دیگران را Request کند.
* Vote شخص دیگر را ارسال کند.
* Action خارج از Phase ارسال کند.
* Action بازیکن دیگر را ارسال کند.
* Timer را تغییر دهد.
* Game Phase را تغییر دهد.
* Winner را تعیین کند.
* Player مرده را Alive کند.
* اطلاعات خصوصی دیگران را Request کند.

تمام Actionها Server-side Validate شوند.

━━━━━━━━━━━━━━━━━━━━
بخش 34 — UI مستقل هر Role
━━━━━━━━━━━━━━━━━━━━

برای هر Role UI مستقل ایجاد کن.

مثلاً:

Mafia:

Header:
«تیم سایه»

Body:
اعضای تیم

Bottom:
«انتخاب هدف»

Detective:

Header:
«تحلیلگر امنیت»

Body:
Players

Bottom:
«بررسی بازیکن»

Doctor:

Header:
«تداوم خدمت»

Body:
Players

Bottom:
«حفاظت»

Citizen:

Header:
«همکار»

Body:
Discussion

Bottom:
«رأی‌گیری»

این UIها نباید فقط با CSS مخفی کردن عناصر ساخته شوند.

Data model نیز باید Role-aware باشد.

━━━━━━━━━━━━━━━━━━━━
بخش 35 — Security Boundary
━━━━━━━━━━━━━━━━━━━━

حتی اگر:

display:none

visibility:hidden

conditional rendering

استفاده شده باشد، اطلاعات محرمانه نباید در payload Client وجود داشته باشد.

مثلاً برای Citizen:

ممنوع:

{
playerId: 05,
role: "MAFIA"
}

حتی اگر UI آن را نشان نمی‌دهد.

به جای آن:

{
playerId: 05,
displayName: "...",
alive: true
}

ارسال شود.

━━━━━━━━━━━━━━━━━━━━
بخش 36 — Timer Engine
━━━━━━━━━━━━━━━━━━━━

Timer باید Server-authoritative باشد.

Client فقط:

serverEndTimestamp

را دریافت کند.

Timer محلی:

remaining = serverEndTimestamp - currentServerAdjustedTime

باشد.

هرگز Timer را با setInterval ساده و مستقل از Server کنترل نکن.

Phase Timerها:

Role Reveal
First Night
Discussion
Defense
Voting
Revote
Night Actions

قابل Configuration باشند.

━━━━━━━━━━━━━━━━━━━━
بخش 37 — Clock Drift
━━━━━━━━━━━━━━━━━━━━

اختلاف ساعت Client و Server را مدیریت کن.

هنگام اتصال:

SERVER_TIME_SYNC

انجام شود.

Client:

offset

را محاسبه کند.

تمام Timerها با Server Time نمایش داده شوند.

━━━━━━━━━━━━━━━━━━━━
بخش 38 — UX Loading
━━━━━━━━━━━━━━━━━━━━

برای هر عملیات Network:

Skeleton / Loading State

طراحی کن.

مثلاً:

«در حال همگام‌سازی با بازی...»

اما Loading نباید باعث Freeze کامل UI شود.

اگر درخواست Action ارسال شده:

Button:

در حال ثبت...

و تا دریافت ACK:

غیرفعال باشد.

━━━━━━━━━━━━━━━━━━━━
بخش 39 — Action ACK
━━━━━━━━━━━━━━━━━━━━

هر Action:

CLIENT_REQUEST
↓
SERVER_VALIDATE
↓
SERVER_ACCEPT / REJECT
↓
CLIENT_UPDATE

باشد.

مثلاً:

ACTION_SUBMITTED

بعد:

ACTION_ACCEPTED

یا:

ACTION_REJECTED

با دلیل:

PHASE_NOT_ACTIVE
PLAYER_DEAD
INVALID_TARGET
ALREADY_ACTED
NOT_AUTHORIZED

━━━━━━━━━━━━━━━━━━━━
بخش 40 — Idempotency
━━━━━━━━━━━━━━━━━━━━

هر Action دارای:

actionId

باشد.

اگر Client یک Action را دوبار ارسال کرد:

Server نباید دوبار آن را اجرا کند.

━━━━━━━━━━━━━━━━━━━━
بخش 41 — Optimistic UI
━━━━━━━━━━━━━━━━━━━━

برای Actionهای حساس مانند:

Vote
Kill
Protect
Investigate

از Optimistic State خطرناک استفاده نکن.

ابتدا:

Server ACK

سپس:

Confirmed State

نمایش داده شود.

━━━━━━━━━━━━━━━━━━━━
بخش 42 — Private Notification
━━━━━━━━━━━━━━━━━━━━

مثلاً Detective:

«نتیجه بررسی بازیکن 07:
تیم سایه»

این Event فقط برای Detective ارسال شود.

Mafia:

«بازیکن 04 هدف نهایی تیم سایه شد.»

فقط برای Mafia ارسال شود.

Doctor:

«حفاظت ثبت شد.»

فقط برای Doctor.

━━━━━━━━━━━━━━━━━━━━
بخش 43 — Public Event
━━━━━━━━━━━━━━━━━━━━

مثلاً:

«شب به پایان رسید.»

«یکی از هم‌تیمی‌ها از بازی خارج شد.»

«رأی‌گیری آغاز شد.»

این Event برای همه بازیکنان زنده ارسال شود.

━━━━━━━━━━━━━━━━━━━━
بخش 44 — Animation State
━━━━━━━━━━━━━━━━━━━━

Animation نباید منبع Truth باشد.

مثلاً:

NightTransition Animation

نباید باعث تغییر Game State شود.

Game State:

NIGHT_STARTED

→ UI Animation

Animation فقط Representation باشد.

━━━━━━━━━━━━━━━━━━━━
بخش 45 — Mobile First
━━━━━━━━━━━━━━━━━━━━

چون هر بازیکن Client مستقل دارد:

طراحی را Mobile First کن.

در صفحه:

* اطلاعات حیاتی بالا
* Phase Indicator
* Timer
* Role
* Action
* Players
* Connection Status

قرار گیرد.

CTA اصلی همیشه قابل دسترس باشد.

از UI شلوغ جلوگیری کن.

━━━━━━━━━━━━━━━━━━━━
بخش 46 — Connection Indicator
━━━━━━━━━━━━━━━━━━━━

همیشه وضعیت اتصال را نمایش بده:

🟢 متصل
🟡 در حال اتصال مجدد
🔴 اتصال قطع

در Disconnect:

«اتصال شما قطع شده.
بازی ادامه دارد.
در حال تلاش برای اتصال مجدد...»

اطلاعات محرمانه را در صفحه Error نمایش نده.

━━━━━━━━━━━━━━━━━━━━
بخش 47 — Spectator Mode
━━━━━━━━━━━━━━━━━━━━

بازیکن حذف‌شده:

Public State

را ببیند.

اما:

Private State جدید

دریافت نکند.

Spectator نباید Chat یا Vote داشته باشد.

━━━━━━━━━━━━━━━━━━━━
بخش 48 — Voice / Discussion
━━━━━━━━━━━━━━━━━━━━

Game Core را به Voice وابسته نکن.

Discussion می‌تواند از:

Voice Call خارجی

یا

Voice Service

استفاده کند.

اما Game Server باید مستقل از Voice باشد.

اگر Voice قطع شد:

Game Logic ادامه پیدا کند.

━━━━━━━━━━━━━━━━━━━━
بخش 49 — فرهنگ بهسازانی
━━━━━━━━━━━━━━━━━━━━

فضای بازی را با هویت عمومی و قابل اتکای بهسازان ملت هماهنگ کن:

* فناوری
* بانکداری دیجیتال
* امنیت
* همکاری
* نوآوری
* هم‌افزایی
* بهبود مستمر
* حل مسئله
* کار تیمی
* تصمیم‌گیری
* ایجاد ارزش

از اطلاعات حساس واقعی شرکت استفاده نکن.

از نام واقعی پروژه‌های محرمانه، کاربران، سیستم‌های داخلی، اطلاعات امنیتی یا ساختار واقعی دسترسی‌ها استفاده نکن.

مکانیک بازی باید Fictional Corporate Mystery باشد.

━━━━━━━━━━━━━━━━━━━━
بخش 50 — سناریوی نمونه کامل
━━━━━━━━━━━━━━━━━━━━

یک Match با 10 بازیکن بساز:

Player 01
Player 02
Player 03
Player 04
Player 05
Player 06
Player 07
Player 08
Player 09
Player 10

Role Distribution:

2 Shadow
1 Don
1 Detective
1 Doctor
5 Organization

اما Role Map را به Clientها Leak نکن.

سناریو:

Lobby
→ همه Ready
→ Start
→ Role Assignment
→ First Night
→ Shadow Team شناخت اعضا
→ Day 1
→ Discussion
→ Voting
→ Player 04 eliminated
→ Reveal
→ Win Check
→ Night 2
→ Shadow Target
→ Detective Investigation
→ Doctor Protection
→ Resolution
→ Morning
→ Day 2
→ ...

تمام Eventها را Log کن.

━━━━━━━━━━━━━━━━━━━━
بخش 51 — تست چندکلاینتی اجباری
━━━━━━━━━━━━━━━━━━━━

حداقل این Simulation را ایجاد کن:

10 Client

هم‌زمان:

Client 01
Client 02
Client 03
Client 04
Client 05
Client 06
Client 07
Client 08
Client 09
Client 10

هر Client Role متفاوت داشته باشد.

بررسی کن:

* آیا Role درست فقط به صاحب آن ارسال شده؟
* آیا Mafia teammates فقط برای Mafia ارسال شده؟
* آیا Detective نتیجه خصوصی را فقط خودش می‌بیند؟
* آیا Doctor Target را فقط خودش می‌بیند؟
* آیا Vote دیگران قبل از Reveal قابل مشاهده نیست؟
* آیا Dead Player Action ندارد؟
* آیا Timer در همه Clientها تقریباً یکسان است؟
* آیا Server State یکسان است؟
* آیا Clientها نمی‌توانند State را دستکاری کنند؟

━━━━━━━━━━━━━━━━━━━━
بخش 52 — Test Matrix
━━━━━━━━━━━━━━━━━━━━

حداقل این سناریوها را اجرا و نتیجه را ثبت کن:

TEST 01
7 Players — Normal Game

TEST 02
10 Players — Normal Game

TEST 03
15 Players — Maximum Game

TEST 04
Mafia disconnects

TEST 05
Doctor disconnects

TEST 06
Detective disconnects

TEST 07
Host disconnects

TEST 08
Two Mafia select different targets

TEST 09
Doctor protects Mafia target

TEST 10
Doctor selects invalid target

TEST 11
Detective selects dead player

TEST 12
Dead player attempts Vote

TEST 13
Player sends duplicate Vote

TEST 14
Player sends Vote after deadline

TEST 15
Client sends Action during wrong phase

TEST 16
Two players vote simultaneously

TEST 17
Tie vote

TEST 18
Tie on Revote

TEST 19
Mafia reaches parity

TEST 20
All Mafia eliminated

TEST 21
Network disconnect during Vote

TEST 22
Network disconnect during Night

TEST 23
Reconnect before deadline

TEST 24
Reconnect after deadline

TEST 25
Late Join

TEST 26
Duplicate Event

TEST 27
Out-of-order Event

TEST 28
Missing Event

TEST 29
State Resync

TEST 30
Refresh browser during game

TEST 31
Multiple browser tabs for same Player

TEST 32
Unauthorized Action

TEST 33
Attempt to inspect another player's Role

TEST 34
Attempt to manipulate timer

TEST 35
Attempt to modify Game Phase

━━━━━━━━━━━━━━━━━━━━
بخش 53 — Acceptance Criteria
━━━━━━━━━━━━━━━━━━━━

بازی فقط زمانی Complete محسوب شود که:

[ ] هر بازیکن Client مستقل دارد.

[ ] Server مرجع نهایی Game State است.

[ ] Roleها Leak نمی‌شوند.

[ ] Private Data فقط به صاحب آن ارسال می‌شود.

[ ] Mafia اطلاعات Faction خود را می‌بیند.

[ ] Night Actions واقعی و Server-side هستند.

[ ] Voting واقعی و Server-side است.

[ ] Timer Server-authoritative است.

[] Tie به‌درستی مدیریت می‌شود.

[ ] Win Condition Server-side است.

[ ] Disconnect مدیریت می‌شود.

[ ] Reconnect مدیریت می‌شود.

[ ] Duplicate Action جلوگیری می‌شود.

[ ] Out-of-order Event مدیریت می‌شود.

[ ] State Resync وجود دارد.

[ ] Dead Player محدود می‌شود.

[ ] Host Disconnect باعث پایان Game نمی‌شود.

[ ] Late Join محدود می‌شود.

[ ] Mobile UI قابل استفاده است.

[ ] Loading State وجود دارد.

[ ] Error State وجود دارد.

[ ] Connection State وجود دارد.

[ ] همه Roleها UI مستقل دارند.

[ ] Animation از Game Logic مستقل است.

[ ] هیچ اطلاعات محرمانه‌ای در Client Payload قرار نمی‌گیرد.

[ ] 35 سناریوی تست بالا اجرا شده‌اند.

━━━━━━━━━━━━━━━━━━━━
بخش 54 — گزارش نهایی تست
━━━━━━━━━━━━━━━━━━━━

در پایان یک:

MULTIPLAYER GAME HEALTH REPORT

ایجاد کن.

برای هر Test:

Test ID
Scenario
Expected Result
Actual Result
Status
Detected Bug
Severity
Fix
Retest Status

ثبت شود.

Severity:

P0 — Game Breaking
P1 — Critical
P2 — Major
P3 — Minor
P4 — Cosmetic

هیچ P0 یا P1 نباید قبل از Release باقی بماند.

━━━━━━━━━━━━━━━━━━━━
بخش 55 — Performance
━━━━━━━━━━━━━━━━━━━━

بررسی کن:

* تعداد Network Events
* Duplicate Events
* State Payload Size
* Render Frequency
* Timer Updates
* Memory
* Animation FPS
* Re-renderهای غیرضروری
* Connection Recovery
* State Synchronization

Timer نباید باعث Re-render کل صفحه شود.

Player List نیز فقط هنگام تغییر واقعی Update شود.

━━━━━━━━━━━━━━━━━━━━
بخش 56 — Versioning
━━━━━━━━━━━━━━━━━━━━

Game Schema Version داشته باش.

مثلاً:

gameVersion:
1.0.0

stateVersion:
1

protocolVersion:
1

هر تغییر مهم Game Rule یا Event Schema باید Version داشته باشد.

━━━━━━━━━━━━━━━━━━━━
بخش 57 — Admin Monitoring
━━━━━━━━━━━━━━━━━━━━

برای Admin:

Game Health Dashboard

نمایش:

* Active Rooms
* Active Games
* Connected Players
* Disconnected Players
* Average Game Duration
* Average Round Duration
* Abandoned Games
* Reconnect Rate
* Vote Errors
* Action Rejections
* Synchronization Errors
* Server Errors

همچنین:

Game Status:

ACTIVE
PAUSED
MAINTENANCE
IMPROVING
DISABLED

━━━━━━━━━━━━━━━━━━━━
بخش 58 — UX Error Messages
━━━━━━━━━━━━━━━━━━━━

خطاهای فنی را به زبان کاربر نمایش نده.

به جای:

WebSocket Error 1006

بنویس:

«ارتباط شما با بازی قطع شد.
در حال اتصال مجدد...»

به جای:

INVALID_PHASE

بنویس:

«این اقدام در این مرحله از بازی قابل انجام نیست.»

به جای:

UNAUTHORIZED_ACTION

بنویس:

«این قابلیت برای نقش شما فعال نیست.»

━━━━━━━━━━━━━━━━━━━━
بخش 59 — اصل بسیار مهم
━━━━━━━━━━━━━━━━━━━━

هرگز برای ساده‌تر شدن UI:

Game Logic را داخل Componentها پخش نکن.

ساختار پیشنهادی:

/game
/engine
/state
/roles
/rules
/events
/actions
/phases
/validation
/transport
/sync
/reconnect
/permissions
/timers

/ui
/lobby
/role
/night
/day
/voting
/spectator
/results
/errors

━━━━━━━━━━━━━━━━━━━━
بخش 60 — دستور نهایی
━━━━━━━━━━━━━━━━━━━━

قبل از تغییر UI فعلی:

تمام Flow فعلی بازی را Audit کن.
Game Logic فعلی را پیدا کن.
Stateهای فعلی را شناسایی کن.
Roleها را شناسایی کن.
Dependencyها را بررسی کن.
مشخص کن کدام قسمت‌ها Single-Device هستند.
مشخص کن کدام قسمت‌ها Fake Multiplayer هستند.
مشخص کن کدام اطلاعات به Client اشتباه ارسال می‌شود.
مشخص کن کدام Timerها Client-side هستند.
مشخص کن کدام Actionها بدون Server Validation اجرا می‌شوند.

سپس:

ARCHITECTURE REPORT

بساز.

بعد:

GAME CORE

را اصلاح کن.

بعد:

MULTIPLAYER STATE MODEL

را ایجاد کن.

بعد:

ROLE PERMISSION SYSTEM

را ایجاد کن.

بعد:

EVENT SYSTEM

را ایجاد کن.

بعد:

RECONNECT / RESYNC

را ایجاد کن.

بعد:

UI را با Game Core جدید متصل کن.

هیچ UI نباید Game Rule مستقل خودش را داشته باشد.

━━━━━━━━━━━━━━━━━━━━
FINAL REQUIREMENT
━━━━━━━━━━━━━━━━━━━━

من یک UI زیبا اما Fake Multiplayer نمی‌خواهم.

من یک Mafia Multiplayer واقعی می‌خواهم که:

هر بازیکن Client مستقل داشته باشد،
هر نقش اطلاعات مخصوص خودش را ببیند،
اطلاعات مخفی بین Clientها Leak نشود،
سرور مرجع نهایی Game State باشد،
Night و Day واقعاً Synchronize باشند،
Actionها Validate شوند،
Voting هم‌زمان و صحیح باشد،
Timerها بین Clientها هماهنگ باشند،
Disconnect و Reconnect مدیریت شود،
و بازی در شرایط واقعی چندبازیکنه از نظر Game Integrity قابل اعتماد باشد.

اگر قابلیت واقعی Backend/Realtime در محیط فعلی وجود ندارد، آن را جعل نکن.

در عوض:

Transport abstraction
+
Mock Multiplayer Simulation
+
Authoritative Game Engine
+
Client Permission Model
+
Event/State Architecture

را به‌صورت واقعی و قابل توسعه ایجاد کن تا Backend واقعی بعداً بدون بازطراحی UI و Game Core متصل شود.

در پایان فقط زمانی کار را Complete اعلام کن که تمام سناریوهای تست تعریف‌شده اجرا، نتیجه‌گیری و خطاهای Critical برطرف شده باشند.

این سند را به‌عنوان مشخصات فنی و Game Design نهایی برای «مافیای بهسازانی» در نظر بگیر.

هدف:

تبدیل بازی به یک Real-Time Multiplayer Hidden-Role Game واقعی که در آن هر بازیکن Client مستقل دارد و هیچ Player نباید اطلاعاتی بیشتر از Permission مربوط به نقش خود دریافت کند.

━━━━━━━━━━━━━━━━━━━━

اصل بنیادین
   ━━━━━━━━━━━━━━━━━━━━

سه لایه کاملاً مستقل ایجاد کن:

GAME SERVER STATE
PLAYER PRIVATE STATE
PUBLIC GAME STATE

هر Client فقط باید این ترکیب را دریافت کند:

PUBLIC STATE
+
CURRENT PLAYER PRIVATE STATE
+
AUTHORIZED FACTION STATE

هرگز Full Game State را به Client ارسال نکن.

مثال:

Player 04 = Detective

او باید بتواند ببیند:

* بازیکنان زنده
* بازیکنان حذف‌شده
* Phase
* Timer
* Vote Results پس از پایان رأی‌گیری
* Role خودش
* Action خودش
* Investigation Result خودش

اما نباید ببیند:

* Role Player 07
* Action Player 02
* Vote ثبت‌شده Player 09 قبل از پایان رأی‌گیری
* Target انتخاب‌شده Mafia
* Investigation نتیجه Don
* Protection Target Doctor

━━━━━━━━━━━━━━━━━━━━
Role Matrix نهایی
━━━━━━━━━━━━━━━━━━━━

ROLE: همکار

Alignment:
ORGANIZATION

Knows:
Nobody

Night Action:
None

Day Action:
Discussion + Vote

Private Information:
Role خود

Faction Information:
None

Win:
تمام اعضای Shadow Team حذف شوند.

---

ROLE: عضو تیم سایه

Alignment:
SHADOW

Knows:
تمام اعضای Shadow Team

Night Action:
Participate in Target Selection

Day Action:
Discussion + Vote

Private Information:
Role خود

Faction Information:
Shadow teammates

Win:
Shadow Team به Parity برسد.

---

ROLE: رهبر تیم سایه

Alignment:
SHADOW

Knows:
تمام Shadow Team

Night Actions:

Participate in Kill
Search for Security Analyst

Search Result:
فقط مشخص کند Target آیا «تحلیلگر امنیت» است یا خیر.

Day:
Discussion + Vote

---

ROLE: تحلیلگر امنیت

Alignment:
ORGANIZATION

Night Action:
Investigate

Target:
یک Player زنده

Result:

SHADOW
یا
ORGANIZATION

Result فقط برای صاحب Role ارسال شود.

---

ROLE: مسئول تداوم خدمت

Alignment:
ORGANIZATION

Night Action:
Protect

Target:
یک Player زنده

Restriction:
Default:
Same target cannot be protected two nights consecutively.

Effect:
اگر Mafia همان Target را انتخاب کند:

Kill = Cancelled

نتیجه Protection برای دیگران نمایش داده نشود.

━━━━━━━━━━━━━━━━━━━━
Role Visibility Matrix
━━━━━━━━━━━━━━━━━━━━

```
               Citizen  Shadow  Don  Detective  Doctor
```

---

Own Role             YES      YES   YES     YES       YES
Own Team             YES      YES   YES     YES       YES
Shadow Members       NO       YES   YES     NO        NO
Detective Identity   NO       NO    YES     YES       NO
Doctor Identity      NO       NO    NO      NO        YES
Investigation Result NO       NO    NO      YES       NO
Protection Result    NO       NO    NO      NO        YES
Night Target         NO       YES   YES     NO        NO
Other Vote           NO*      NO*   NO*     NO*       NO*

* تا قبل از پایان Vote نباید قابل مشاهده باشد.

━━━━━━━━━━━━━━━━━━━━
Client Capability Matrix
━━━━━━━━━━━━━━━━━━━━

هر Client باید Capabilities داشته باشد.

Citizen:

canSpeak = true
canVote = true
canNightAction = false
canSeeFaction = false

Shadow:

canSpeak = true
canVote = true
canNightAction = true
canSeeFaction = true
canSelectNightTarget = true

Don:

canSpeak = true
canVote = true
canNightAction = true
canSeeFaction = true
canInvestigateDetective = true

Detective:

canSpeak = true
canVote = true
canInvestigate = true

Doctor:

canSpeak = true
canVote = true
canProtect = true

Spectator:

canSpeak = false
canVote = false
canNightAction = false
canReceivePrivateEvents = false

این Capabilities باید Server-side نیز Validate شوند.

UI Permission به‌تنهایی کافی نیست.

━━━━━━━━━━━━━━━━━━━━
Game State Machine
━━━━━━━━━━━━━━━━━━━━

STATE:

LOBBY

↓ همه Ready

READY_CHECK

↓

ROLE_ASSIGNMENT

↓

ROLE_REVEAL

↓

FIRST_NIGHT

↓

DAY_MORNING

↓

DAY_DISCUSSION

↓

DAY_VOTING

↓

VOTE_RESOLUTION

↓

WIN_CHECK

↓

اگر بازی ادامه دارد:

NIGHT_START

↓

NIGHT_ACTIONS

↓

NIGHT_RESOLUTION

↓

WIN_CHECK

↓

DAY_MORNING

و این چرخه ادامه پیدا کند.

اگر Winner مشخص شد:

GAME_OVER

━━━━━━━━━━━━━━━━━━━━
State Transition Rules
━━━━━━━━━━━━━
━━━━━━━

هیچ Client نباید State را تغییر دهد.

Client فقط Request ارسال می‌کند.

مثال:

CLIENT:
REQUEST_VOTE

SERVER:
Validate

SERVER:
ACCEPT_VOTE

SERVER:
Broadcast Vote State according to visibility rules

یا:

SERVER:
REJECT_VOTE

Reason:

PLAYER_DEAD

یا:

INVALID_PHASE

یا:

ALREADY_VOTED

━━━━━━━━━━━━━━━━━━━━
Lobby State
━━━━━━━━━━━━━━━━━━━━

PUBLIC:

Room Code
Player List
Avatar
Ready Status
Player Count

PRIVATE:

Own Player ID
Own Session
Connection Status

HIDDEN:

Role
Faction
Future Role Assignment

Host:

Start Game

اما Host نباید Role Map را دریافت کند.

━━━━━━━━━━━━━━━━━━━━
Role Assignment State
━━━━━━━━━━━━━━━━━━━━

Server:

Generate Roles
↓
Shuffle
↓
Assign
↓
Persist
↓
Create Private Role Payload

برای هر Player فقط:

role
alignment
abilities
objectives

ارسال شود.

هیچ Client نباید Roleهای سایر بازیکنان را در Payload دریافت کند.

━━━━━━━━━━━━━━━━━━━━
Role Reveal State
━━━━━━━━━━━━━━━━━━━━

برای هر Player:

ROLE_REVEAL

Payload:

{
role,
alignment,
ability,
objective
}

برای Shadow:

علاوه بر موارد بالا:

AUTHORIZED_FACTION_MEMBERS

ارسال شود.

برای Citizen:

این فیلد اصلاً وجود نداشته باشد.

━━━━━━━━━━━━━━━━━━━━
First Night State
━━━━━━━━━━━━━━━━━━━━

اگر Shadow حداقل دو نفر دارد:

FIRST_NIGHT = Coordination

Shadow Players:

Shadow Members را مشاهده می‌کنند.

هیچ Kill انجام نمی‌شود.

Doctor:
No Action

Detective:
No Action

Don:
No Action

پس:

DAY_1

این الگو با قواعد رایج «Night Zero» نیز سازگار است که در آن اعضای مافیا ابتدا یکدیگر را می‌شناسند و در حالت پایه قتل شب اول انجام نمی‌شود.

━━━━━━━━━━━━━━━━━━━━
Day Morning
━━━━━━━━━━━━━━━━━━━━

Server Night Result را محاسبه کرده باشد.

Public Event:

NIGHT_RESOLUTION_PUBLIC

Payload فقط:

killedPlayer
یا
noDeath

هرگز:

killer
doctor
investigator
target selection

Broadcast نشود.

━━━━━━━━━━━━━━━━━━━━
Discussion State
━━━━━━━━━━━━━━━━━━━━

Speaker Queue:

Server Generated

مثلاً:

01
03
04
06
08
09
10

هر Player:

speakerStatus
remainingTime
canSpeak

را دریافت کند.

Current Speaker:

CAN SPEAK

Other Players:

LISTEN ONLY

Dead:

SPECTATOR

━━━━━━━━━━━━━━━━━━━━
Discussion Timer
━━━━━━━━━━━━━━━━━━━━

Server:

discussionEndTimestamp

Client:

remainingTime =
serverEndTimestamp - synchronizedServerTime

Client نباید Timer اصلی را کنترل کند.

اگر Client Timer را دستکاری کند:

Game State نباید تغییر کند.

━━━━━━━━━━━━━━━━━━━━
Nomination
━━━━━━━━━━━━━━━━━━━━

بعد از Discussion:

NOMINATION_OPEN

بازیکنان زنده می‌توانند Candidate معرفی کنند.

Candidate باید:

Alive
≠ Self
Valid Player

باشد.

━━━━━━━━━━━━━━━━━━━━
Voting State
━━━━━━━━━━━━━━━━━━━━

برای هر Player:

Vote UI

فقط بازیکنان مجاز را نمایش بده.

هر Player:

یک Vote

Vote Request:

{
actionId,
gameId,
playerId,
targetId,
clientTimestamp
}

Server:

Validate

━━━━━━━━━━━━━━━━━━━━
Vote Privacy
━━━━━━━━━━━━━━━━━━━━

تا زمانی که Vote Open است:

Public:

"7 / 10 votes submitted"

اما:

WHO VOTED FOR WHOM

مخفی.

پس از پایان:

VOTE_RESULT

Broadcast شود.

این ساختار با مکانیک کلاسیک مافیا که روز با بحث و رأی‌گیری عمومی به حذف یک مظنون منتهی می‌شود هم‌خوان است.

━━━━━━━━━━━━━━━━━━━━
Vote Resolution
━━━━━━━━━━━━━━━━━━━━

Server:

Count Votes

↓

Find Maximum

↓

اگر فقط یک Winner:

ELIMINATE

اگر Tie:

TIE

↓

REVOTE

در Revote:

فقط بازیکنان Tie شده قابل انتخاب هستند.

اگر دوباره Tie:

NO_ELIMINATION

↓

NIGHT

━━━━━━━━━━━━━━━━━━━━
Elimination
━━━━━━━━━━━━━━━━━━━━

Player:

alive = false

capabilities = NONE

state = SPECTATOR

اگر Rule:

Reveal Role On Death = TRUE

آنگاه:

Public:

Player Role

نمایش داده شود.

اگر Role Reveal فعال نیست:

Role مخفی باقی بماند.

Role Reveal on Death باید Configurable باشد، چون در نسخه‌های مختلف مافیا این قانون متفاوت است.

━━━━━━━━━━━━━━━━━━━━
Night State
━━━━━━━━━━━━━━━━━━━━

NIGHT_START

↓

NIGHT_ACTIONS

هر Role فقط Action خودش را ببیند.

Shadow:

SELECT TARGET

Don:

INVESTIGATE DETECTIVE

Detective:

INVESTIGATE PLAYER

Doctor:

PROTECT PLAYER

Citizen:

WAIT

━━━━━━━━━━━━━━━━━━━━
Night Action UI
━━━━━━━━━━━━━━━━━━━━

Shadow UI:

"هدف احتمالی تیم سایه را انتخاب کنید."

Players:

Alive only

After selection:

"انتخاب شما ثبت شد."

اما تا Resolution:

Target Final

اعلام نشود.

━━━━━━━━━━━━━━━━━━━━
Shadow Consensus
━━━━━━━━━━━━━━━━━━━━

اگر 3 Shadow وجود دارند:

Shadow A → Player 04
Shadow B → Player 04
Don → Player 07

Server:

04 = 2
07 = 1

Final Target:

04

Shadow UI:

"هدف نهایی تیم ثبت شد."

اما Playerهای Organization هیچ اطلاعاتی دریافت نکنند.

اگر Tie داخل Shadow:

Rule:

Deadline نزدیک شود
↓
Tie Break by Don's vote

اگر Don نیز در Tie بود:

Deterministic Server Resolution

هرگز Random Client-side نباشد.

━━━━━━━━━━━━━━━━━━━━
Doctor Resolution
━━━━━━━━━━━━━━━━━━━━

Doctor Target:

Player 04

Shadow Target:

Player 04

Server:

Kill Event
+
Protection Event

↓

Protection wins

↓

No Death

Public:

"دیشب کسی از بازی خارج نشد."

Doctor:

"حفاظت شما موفق بود."

این پیام فقط برای Doctor باشد.

━━━━━━━━━━━━━━━━━━━━
Detective Resolution
━━━━━━━━━━━━━━━━━━━━

Detective:

Player 07

Server:

Check Alignment

↓

Private Event:

INVESTIGATION_RESULT

Payload:

targetId
result

هیچ Player دیگری این Event را دریافت نکند.

━━━━━━━━━━━━━━━━━━━━
Don Resolution
━━━━━━━━━━━━━━━━━━━━

Don:

Player 07

Server:

Is Detective?

↓

Private Result

DON_RESULT

فقط برای Don.

━━━━━━━━━━━━━━━━━━━━
Night Resolution Ordering
━━━━━━━━━━━━━━━━━━━━

ترتیب دقیق:

Lock Phase
Validate all Actions
Remove Invalid Actions
Resolve Investigations
Resolve Protection
Resolve Shadow Target
Resolve Kill
Generate Private Results
Generate Public Result
Update Alive Players
Check Win
Increment Round
Transition

این ترتیب باید Deterministic باشد.

━━━━━━━━━━━━━━━━━━━━
Action Validation
━━━━━━━━━━━━━━━━━━━━

هر Action باید:

actionId
playerId
gameId
phase
round
targetId
serverReceivedAt

داشته باشد.

Server بررسی کند:

playerId valid؟
session valid؟
player alive؟
correct role؟
correct phase؟
action already used؟
target alive؟
target allowed؟

اگر هرکدام False:

ACTION_REJECTED

━━━━━━━━━━━━━━━━━━━━
Action Idempotency
━━━━━━━━━━━━━━━━━━━━

اگر:

actionId = A123

دوباره ارسال شد:

Action دوباره اجرا نشود.

Server:

Already Processed

برگرداند.

━━━━━━━━━━━━━━━━━━━━
Reconnect
━━━━━━━━━━━━━━━━━━━━

اگر Player قطع شد:

PLAYER_DISCONNECTED

Public:

فقط Connection Indicator مناسب نمایش داده شود.

اطلاعات خصوصی Broadcast نشود.

Server:

Player State را حفظ کند.

هنگام برگشت:

RECONNECT_REQUEST

↓

SESSION_VALIDATE

↓

STATE_SNAPSHOT

↓

PRIVATE_STATE

↓

RESUME

━━━━━━━━━━━━━━━━━━━━
State Snapshot
━━━━━━━━━━━━━━━━━━━━

Snapshot شامل:

gameVersion
stateVersion
phase
round
alivePlayers
publicEvents
timer
playerCapabilities

و برای همان Player:

privateRole
privateFaction
privateResults
privateActions

باشد.

━━━━━━━━━━━━━━━━━━━━
Event Map
━━━━━━━━━━━━━━━━━━━━

LOBBY:

ROOM_CREATED
PLAYER_JOINED
PLAYER_READY
PLAYER_UNREADY
GAME_START_REQUESTED
GAME_STARTED

ROLE:

ROLE_ASSIGNED
ROLE_REVEALED

NIGHT:

NIGHT_STARTED
FACTION_REVEALED
ACTION_AVAILABLE
ACTION_SUBMITTED
ACTION_ACCEPTED
ACTION_REJECTED
NIGHT_LOCKED
NIGHT_RESOLVED

DAY:

MORNING_STARTED
DISCUSSION_STARTED
SPEAKER_STARTED
SPEAKER_ENDED
DISCUSSION_ENDED

VOTE:

VOTING_STARTED
VOTE_SUBMITTED
VOTE_LOCKED
VOTING_ENDED
TIE_DETECTED
REVOTE_STARTED
ELIMINATION_RESOLVED

CONNECTION:

PLAYER_CONNECTED
PLAYER_DISCONNECTED
PLAYER_RECONNECTED
STATE_RESYNC_REQUESTED
STATE_RESYNCED

GAME:

WIN_CHECK
GAME_OVER

━━━━━━━━━━━━━━━━━━━━
Event Visibility Matrix
━━━━━━━━━━━━━━━━━━━━

Event                         Public  Owner  Faction

ROLE_ASSIGNED                   NO     YES     NO
FACTION_REVEALED                NO     YES    YES
VOTE_SUBMITTED                  NO     YES     NO
VOTE_RESULT                     YES    YES     YES
INVESTIGATION_RESULT            NO     YES     NO
PROTECTION_RESULT               NO     YES     NO
SHADOW_TARGET                   NO     NO     YES
NIGHT_DEATH                     YES    YES     YES
GAME_OVER                       YES    YES     YES

━━━━━━━━━━━━━━━━━━━━
اطلاعاتی که هرگز نباید Leak شوند
━━━━━━━━━━━━━━━━━━━━

این موارد نباید قبل از زمان مجاز به Client نامرتبط برسند:

* Role
* Alignment
* Shadow Members
* Shadow Target
* Doctor Target
* Detective Result
* Don Result
* Individual Vote
* Unresolved Action
* Future Phase
* Hidden Server State

مهم:

Hide کردن در UI کافی نیست.

این اطلاعات اصلاً نباید در Payload آن Client وجود داشته باشد.

━━━━━━━━━━━━━━━━━━━━
Same Account / Multiple Tabs
━━━━━━━━━━━━━━━━━━━━

اگر یک Player با دو Tab وارد شد:

Server باید Session Policy داشته باشد.

Default:

ONE ACTIVE SESSION PER PLAYER

Session جدید:

Previous Session Invalidated

یا:

Session Rejected

این Rule را Configurable کن.

━━━━━━━━━━━━━━━━━━━━
Browser Refresh
━━━━━━━━━━━━━━━━━━━━

Refresh نباید Player را از Game خارج کند.

پس از Refresh:

Session Recovery
↓
Authentication
↓
Game Lookup
↓
State Snapshot
↓
Private State Restore

━━━━━━━━━━━━━━━━━━━━
Host Disconnect
━━━━━━━━━━━━━━━━━━━━

Host نباید مالک Game State باشد.

Game Server مالک State است.

Host Disconnect:

Game ادامه پیدا کند.

اگر Host UI لازم است:

HOST_TRANSFER

به Player دیگری داده شود.

Roleها و State نباید تغییر کنند.

━━━━━━━━━━━━━━━━━━━━
پایان بازی
━━━━━━━━━━━━━━━━━━━━

بعد از هر:

Night Resolution
Vote Resolution
Elimination

اجرا کن:

CHECK_WIN_CONDITION

Organization Wins:

Shadow Alive = 0

Shadow Wins:

Shadow Alive >= Organization Alive

اگر True:

GAME_OVER

━━━━━━━━━━━━━━━━━━━━
Game Over Payload
━━━━━━━━━━━━━━━━━━━━

Public:

winner
duration
rounds
eliminatedPlayers
finalRoles

Private:

personalStats

بعد از Game Over:

تمام Roleها برای همه قابل مشاهده شوند.

━━━━━━━━━━━━━━━━━━━━
Role Matrix در UI
━━━━━━━━━━━━━━━━━━━━

برای Figma Make یک Role Simulator بساز.

امکان انتخاب:

PLAYER 01
PLAYER 02
...
PLAYER 15

و Role:

Citizen
Shadow
Don
Detective
Doctor

سپس:

"Preview Client State"

را نمایش بده.

مثلاً:

Preview as Detective

باید فقط اطلاعاتی را نمایش دهد که Detective واقعاً اجازه دیدنش را دارد.

Preview as Citizen

نباید Investigation Result را نمایش دهد.

Preview as Shadow

باید Shadow Members را نمایش دهد.

این ابزار برای QA بسیار مهم است.

━━━━━━━━━━━━━━━━━━━━
Multiplayer Simulation
━━━━━━━━━━━━━━━━━━━━

یک Simulation Environment ایجاد کن:

CLIENT_01
CLIENT_02
CLIENT_03
CLIENT_04
CLIENT_05
CLIENT_06
CLIENT_07
CLIENT_08
CLIENT_09
CLIENT_10

هر Client:

Role
Connection
Phase
Private State
Public State
Capabilities

داشته باشد.

یک Event را اجرا کن و نشان بده چه Clientهایی آن را دریافت می‌کنند.

━━━━━━━━━━━━━━━━━━━━
مثال Simulation
━━━━━━━━━━━━━━━━━━━━

Roles:

01 = Citizen
02 = Shadow
03 = Detective
04 = Citizen
05 = Doctor
06 = Shadow
07 = Citizen
08 = Don
09 = Citizen
10 = Citizen

Event:

SHADOW_TARGET_SELECTED

Expected:

Client 02 → RECEIVE
Client 06 → RECEIVE
Client 08 → RECEIVE

Client 01 → NO
Client 03 → NO
Client 04 → NO
Client 05 → NO
Client 07 → NO
Client 09 → NO
Client 10 → NO

Event:

INVESTIGATION_RESULT

Owner:

Client 03

Expected:

Client 03 → RECEIVE

All others:

NO

━━━━━━━━━━━━━━━━━━━━
Automated Privacy Test
━━━━━━━━━━━━━━━━━━━━

برای هر Event:

FOR EACH CLIENT

CHECK:

Does payload contain unauthorized information?

اگر YES:

SECURITY FAILURE

اگر NO:

PASS

این Test باید قبل از Release اجرا شود.

━━━━━━━━━━━━━━━━━━━━
Network Race Test
━━━━━━━━━━━━━━━━━━━━

هم‌زمان:

Player 02 submits target A

Player 06 submits target B

Doctor submits target A

Detective submits investigation

همه در کمتر از چند میلی‌ثانیه.

Server باید:

تمام Actionها را با Server Sequence مرتب کند.

هیچ Client نباید State متفاوت نهایی داشته باشد.

━━━━━━━━━━━━━━━━━━━━
Deterministic State
━━━━━━━━━━━━━━━━━━━━

اگر تمام Clientها آخرین Eventهای معتبر را دریافت کرده‌اند:

Public State آنها باید یکسان باشد.

Private State آنها متفاوت است، اما فقط در بخش مجاز.

هدف:

PUBLIC_STATE(Client A)

PUBLIC_STATE(Client B)

PUBLIC_STATE(Client C)

اما:

PRIVATE_STATE(A)
≠
PRIVATE_STATE(B)

به‌صورت طبیعی.

━━━━━━━━━━━━━━━━━━━━
تست سناریوی کامل
━━━━━━━━━━━━━━━━━━━━

سناریو:

10 Player

Day 1
↓
Discussion
↓
Vote
↓
Player 04 eliminated
↓
Role Reveal
↓
Night 1
↓
Shadow selects 07
↓
Doctor protects 07
↓
Detective investigates 06
↓
Don investigates 03
↓
Night Resolution
↓
No Death
↓
Morning
↓
Day 2
↓
Discussion
↓
Vote
↓
Player 0
6 eliminated
↓
Check Win

در هر مرحله:

Public State
Private State
Faction State

را جداگانه Verify کن.

━━━━━━━━━━━━━━━━━━━━
Acceptance Criteria نهایی
━━━━━━━━━━━━━━━━━━━━

Game فقط در صورت PASS شدن همه موارد زیر قابل انتشار است:

[ ] Role privacy
[ ] Faction privacy
[ ] Private action privacy
[ ] Vote privacy
[ ] Server authority
[ ] Server timer
[ ] Action validation
[ ] Action idempotency
[ ] Event sequencing
[ ] Reconnection
[ ] State resync
[ ] Host recovery
[ ] Browser refresh recovery
[ ] Dead player isolation
[ ] Tie handling
[ ] Revote
[ ] Night resolution
[ ] Win condition
[ ] Mobile UX
[ ] Multiplayer simulation
[ ] Privacy test
[ ] Race-condition test
[ ] 7-player test
[ ] 10-player test
[ ] 15-player test

هیچ Critical Failure نباید باقی بماند.

━━━━━━━━━━━━━━━━━━━━
مهم‌ترین دستور برای Figma Make
━━━━━━━━━━━━━━━━━━━━

قبل از ساخت یا اصلاح هر صفحه:

ابتدا مشخص کن:

WHO IS THE PLAYER?

WHAT IS THEIR ROLE?

WHAT IS THEIR ALIGNMENT?

WHAT CAN THEY KNOW?

WHAT CAN THEY DO?

WHAT CAN THEY RECEIVE?

WHAT MUST THEY NEVER RECEIVE?

سپس UI را Render کن.

یعنی:

PERMISSION
↓
STATE
↓
ACTION
↓
SERVER VALIDATION
↓
EVENT
↓
UI

و نه:

UI
↓
دکمه
↓
تغییر مستقیم State

━━━━━━━━━━━━━━━━━━━━
قانون نهایی
━━━━━━━━━━━━━━━━━━━━

هر چیزی که بازیکن می‌بیند باید یکی از این سه منبع را داشته باشد:

PUBLIC SERVER STATE

PRIVATE AUTHORIZED STATE

AUTHORIZED FACTION STATE

اگر هیچ‌کدام نیست:

نمایش آن اطلاعات ممنوع است.

این Rule را در تمام بازی مافیای بهسازانی enforce کن.