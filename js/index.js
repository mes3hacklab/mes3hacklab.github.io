function terminalSite() {
    return {
      screen: 'list',
      typedCommand: '',
      subpageHeader: '',
      subpageBody: '',
      subpageHtml: '',
      subpageAssets: [],
      currentNodes: [],
      cursorVisible: true,
      typingTimer: null,
      cursorTimer: null,
      currentPath: '',
      bootDone: false,
      history: [],
      brandLabel: 'nessun evento in programma',
      hasUpcomingEvent: false,
      nextEvent: null,

      parentPath(path) {
        const parts = path.split('/');
        parts.pop();
        const out = parts.join('/');
        return out || '';
      },

      joinPath(base, name) {
        const cleanBase = (base || '').replace(/\/+$/, '');
        const cleanName = (name || '').replace(/^\/+/, '');
        if (!cleanBase) return cleanName;
        return `${cleanBase}/${cleanName}`;
      },

      commandPath(itemPath) {
        return itemPath.replace(/^\/+/, '');
      },

      parseCalendarLine(line) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return null;
        if (/^\|\s*---/.test(trimmed)) return null;
        if (/^\|\s*\*\*data\*\*/i.test(trimmed)) return null;

        const parts = trimmed
          .split('|')
          .map(part => part.trim())
          .filter(Boolean);

        if (parts.length < 5) return null;

        const [dateStr, title, startStr, endStr, location] = parts;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
        if (!/^\d{2}:\d{2}$/.test(startStr)) return null;
        if (!/^\d{2}:\d{2}$/.test(endStr)) return null;

        const startDate = new Date(`${dateStr}T${startStr}:00`);
        const endDate = new Date(`${dateStr}T${endStr}:00`);

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

        return {
          dateStr,
          title,
          startStr,
          endStr,
          location,
          date: startDate,
          startDate,
          endDate
        };
      },

      formatBrandEvent(event) {
        const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
        const day = String(event.date.getDate()).padStart(2, '0');
        const month = months[event.date.getMonth()];
        return `${day} ${month} ${event.startStr} / ${event.title}`;
      },

      escapeICS(text = '') {
        return String(text)
          .replace(/\\/g, '\\\\')
          .replace(/\r?\n/g, '\\n')
          .replace(/,/g, '\\,')
          .replace(/;/g, '\\;');
      },

      toICSDateUTC(date) {
        const pad = (n) => String(n).padStart(2, '0');
        return (
          date.getUTCFullYear() +
          pad(date.getUTCMonth() + 1) +
          pad(date.getUTCDate()) + 'T' +
          pad(date.getUTCHours()) +
          pad(date.getUTCMinutes()) +
          pad(date.getUTCSeconds()) + 'Z'
        );
      },

      createICS(event) {
        const start = event.startDate;
        const end = event.endDate;
        const locationFull = event.location;
        const uid = `${event.dateStr}-${event.startStr}-${event.title}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') + '@mes3hacklab.org';

        return [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//mes3hacklab//event//IT',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${this.toICSDateUTC(new Date())}`,
          `DTSTART:${this.toICSDateUTC(start)}`,
          `DTEND:${this.toICSDateUTC(end)}`,
          `SUMMARY:${this.escapeICS(event.title)}`,
          `LOCATION:${this.escapeICS(locationFull)}`,
          `DESCRIPTION:${this.escapeICS(`Evento mes3hacklab\\nLuogo: ${locationFull}`)}`,
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\r\n');
      },

      downloadEventICS(event) {
        const ics = this.createICS(event);
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const safeName = this.eventSafeName(event);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName || 'evento-mes3hacklab'}.ics`;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },

      downloadNextEventICS() {
        if (!this.nextEvent) return;

        this.downloadEventICS(this.nextEvent);
      },

      async loadNextEventBrand() {
        try {
          const raw = await this.fetchText('content/events/calendar/index.md');
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const events = raw
            .split('\n')
            .map(line => this.parseCalendarLine(line))
            .filter(Boolean)
            .filter(event => {
              const eventDay = new Date(event.startDate);
              eventDay.setHours(0, 0, 0, 0);
              return eventDay >= today;
            })
            .sort((a, b) => a.startDate - b.startDate);

          if (!events.length) {
            this.brandLabel = 'nessun evento in programma';
            this.hasUpcomingEvent = false;
            this.nextEvent = null;
            return;
          }

          this.nextEvent = events[0];
          this.brandLabel = this.formatBrandEvent(events[0]);
          this.hasUpcomingEvent = true;
        } catch (err) {
          console.error('nessun evento in programma', err);
          this.brandLabel = 'mes3hacklab';
          this.hasUpcomingEvent = false;
          this.nextEvent = null;
        }
      },

      tree: {
        root: [
          { id: 'events', label: 'eventi/', type: 'dir', path: '/events' },
          { id: 'projects', label: 'progetti/', type: 'dir', path: '/projects' },
          { id: 'media', label: 'media/', type: 'dir', path: '/media' },
          { id: 'contacts', label: 'contatti/', type: 'dir', path: '/contacts' },
          { id: 'about-us', label: 'chi-siamo/', type: 'dir', path: '/about-us' }
        ],

        '/events': [
          { id: 'calendar', label: 'calendario/', type: 'dir', path: '/events/calendar' },
          {
            id: 'micro-conference-2026',
            label: 'micro-conference-2026.md',
            type: 'file',
            src: 'content/events/micro-conference-2026.md',
            path: '/events/micro-conference-2026.md'
          },
          {
            id: 'aperitivo-mes3hacklab-2025',
            label: 'aperitivo-mes3hacklab-2025.md',
            type: 'file',
            src: 'content/events/aperitivo-mes3hacklab-2025.md',
            path: '/events/aperitivo-mes3hacklab-2025.md'
          },
          {
            id: 'ESC2K13',
            label: 'ESC2K13.md',
            type: 'file',
            src: 'content/events/ESC2K13.md',
            path: '/events/ESC2K13.md'
          }
        ],

        '/events/calendar': [
          {
            id: 'index',
            label: 'INDEX.md',
            type: 'file',
            src: 'content/events/calendar/index.md',
            path: '/events/calendar/index.md',
          },
        ],

        '/projects': [
          {
            id: 'pa-italiana',
            label: 'pa-italiana.md',
            type: 'file',
            src: 'content/projects/pa-italiana.md',
            path: '/projects/pa-italiana.md'
          },
          {
            id: 'yodo',
            label: 'yodo.md',
            type: 'file',
            src: 'content/projects/yodo.md',
            path: '/projects/yodo.md'
          },
          {
            id: 'onionmail',
            label: 'onionmail.lnk',
            type: 'lnk',
            href: 'https://onionmail.info/',
            sub: 'https://onionmail.info'
          },
          {
            id: 'the dorkside of google',
            label: 'the-dorkside-of-google.md',
            type: 'file',
            src: 'content/projects/the-dorkside-of-google.md',
            path: '/projects/the-dorkside-of-google.md'
          },
          {
            id: 'malavoria TTRPG',
            label: 'malavoria-ttrpg.md',
            type: 'file',
            src: 'content/projects/malavoria-ttrpg.md',
            path: '/projects/malavoria-ttrpg.md'
          }
        ],

        '/contacts': [
          {
            id: 'mail',
            label: 'mail.lnk',
            type: 'lnk',
            href: 'mailto:info@mes3hacklab.org',
            sub: 'info@mes3hacklab.org'
          },
          {
            id: 'instagram',
            label: 'instagram.lnk',
            type: 'lnk',
            href: 'https://instagram.com/mes3hacklab',
            sub: '@mes3hacklab'
          },
          {
            id: 'telegram',
            label: 'telegram.lnk',
            type: 'action',
            action: 'telegram',
            sub: 't.me/mes3hacklab'
          },
          {
            id: 'crew',
            label: 'crew.md',
            type: 'file',
            src: 'content/contacts/crew.md',
            path: '/contacts/crew.md'
          },
        ],

        '/media': [
          {
            id: 'kawaii-photo-dump',
            label: 'kawaii-photo-dump.md',
            type: 'file',
            src: 'content/media/kawaii-photo-dump.md',
            path: '/media/kawaii-photo-dump.md'
          },
        ],

        '/about-us': [
          {
            id: 'manifesto',
            label: 'manifesto.md',
            type: 'file',
            src: 'content/about-us/manifesto.md',
            path: '/about-us/manifesto.md'
          },
        ],
      },

      async populateCalendar() {
        try {
          await this.fetchText('content/events/calendar/index.md').then(raw =>
            raw
              .split('\n')
              .map(line => this.parseCalendarLine(line))
              .filter(Boolean)
              .sort((a, b) => a.startDate - b.startDate)
              .forEach(item => {
                const safeName = this.eventSafeName(item);

                this.currentNodes.push({
                  id: safeName,
                  label: `${safeName.toUpperCase()}.ics`,
                  type: 'download',
                  event: item,
                  path: `/events/calendar/${safeName}`
                });
              })
            );
        } catch (e) {
          console.log(e);
        }
      },

      init() {
        window.history.replaceState({ internal: true, depth: 0 }, '');

        window.addEventListener('popstate', (event) => {
          if (event.state && event.state.internal && this.history.length > 0) {
            this.goBack(true);
          }
        });

        this.loadNextEventBrand();

        setTimeout(() => {
          this.bootDone = true;
          this.runCommand('ls', () => {
            this.openDirectory('');
            this.history = [];
          });
        }, 2000);

        this.cursorTimer = setInterval(() => {
          this.cursorVisible = !this.cursorVisible;
        }, 520);
      },

      host() {
        return 'root@mes3hacklab:/home/mhl/# ';
      },

      canGoBack() {
        return this.history.length > 0;
      },

      nodeHint(item) {
        if (item.type === 'dir') return 'cartella';
        if (item.type === 'file' || item.type === 'download') return 'file';
        if (item.type === 'lnk') return 'link esterno';
        if (item.type === 'action') return 'azione';
        return '';
      },

      snapshot() {
        return {
          screen: this.screen,
          currentPath: this.currentPath,
          currentNodes: [...this.currentNodes],
          subpageHeader: this.subpageHeader,
          subpageBody: this.subpageBody,
          subpageHtml: this.subpageHtml,
          subpageAssets: [...this.subpageAssets]
        };
      },

      pushHistory() {
        this.history.push(this.snapshot());
        window.history.pushState(
          { internal: true, depth: this.history.length },
          ''
        );
      },

      goBack(fromPopState = false) {
        const prev = this.history.pop();
        if (!prev) return;

        this.screen = prev.screen;
        this.currentPath = prev.currentPath;
        this.currentNodes = [...prev.currentNodes];
        this.subpageHeader = prev.subpageHeader;
        this.subpageBody = prev.subpageBody;
        this.subpageHtml = prev.subpageHtml;
        this.subpageAssets = [...prev.subpageAssets];
        this.typedCommand = '';

        this.$nextTick(() => {
          if (this.$refs.viewport) this.$refs.viewport.scrollTop = 0;
        });

        if (!fromPopState) {
          window.history.back();
        }
      },

      openDirectory(path) {
        this.screen = 'list';
        this.currentPath = path;
        this.currentNodes = this.tree[path || 'root'] || [];
        if (path === '/events/calendar') {
          this.populateCalendar();
        }
        this.subpageHeader = '';
        this.subpageBody = '';
        this.subpageHtml = '';
        this.subpageAssets = [];
      },

      clearOutput() {
        this.screen = '';
        this.subpageHeader = '';
        this.subpageBody = '';
        this.subpageHtml = '';
        this.subpageAssets = [];
      },

      runCommand(text, callback) {
        clearInterval(this.typingTimer);
        this.clearOutput();
        this.typedCommand = '';
        let i = 0;

        this.typingTimer = setInterval(() => {
          this.typedCommand = text.slice(0, i + 1);
          i++;
          if (i >= text.length) {
            clearInterval(this.typingTimer);
            setTimeout(() => {
              callback?.();
              this.$nextTick(() => {
                if (this.$refs.viewport) this.$refs.viewport.scrollTop = 0;
              });
            }, 90);
          }
        }, 18);
      },

      previousCommand: '',
      showPopup: false,
      blink: false,
      popupHeader: '',
      popupHtml: '',
      popupFooter: '',
      popupProgressBar: '',
      
      showPopupPrompt(path) {
        clearInterval(this.typingTimer);
        this.previousCommand = this.typedCommand;
        this.typedCommand = '';
        let i = 0;

        let text = `wget ${path}`;

        this.typingTimer = setInterval(() => {
          this.typedCommand = text.slice(0, i + 1);
          i++;
          if (i >= text.length) {
            clearInterval(this.typingTimer);
            setTimeout(() => {
              this.$nextTick(() => {
                if (this.$refs.viewport) this.$refs.viewport.scrollTop = 0;
              });
            }, 90);
          }
          this.blink = true;
        }, 18);
      },

      openPopup(event, filename) {
        this.blink = false;
        this.showPopup = true;
        this.pushHistory();
        this.popupHeader = `--${this.getTimestamp()}--  https://mes3hacklab.org/events/calendar/${filename}\n
Loaded CA certificate '/etc/ssl/certs/ca-certificates.crt'\n
Resolving mes3hacklab.org (mes3hacklab.org)...\n
Connecting to mes3hacklab.org (mes3hacklab.org)... connected.\n
HTTP request sent, awaiting response... 200 OK\n
Length: unspecified [application/javascript]\n
Saving to: ‘${filename}.ics’\n`;

        let progressBar = '>-------------------';
        let i = 0;
        let timer = setInterval(() => {
          progressBar = '='.repeat(i) + progressBar.substring(i - 1, 20);
          this.popupHtml = `${filename} [${progressBar}]`;
          i++;
          if (i >= progressBar.length) {
            clearInterval(timer);
            this.popupFooter = `${this.getTimestamp()} - ‘${filename}’ saved`;
            this.downloadEventICS(event);
            setTimeout(() => {
              this.restoreCommand();
            }, 2000);
          }
        }, 20);
      },

      restoreCommand() {
        clearInterval(this.typingTimer);

        this.showPopup = false;
        this.popupHeader = '';
        this.popupHtml = '';
        this.popupFooter = '';

        // Command
        this.typedCommand = this.previousCommand;
        this.previousCommand = '';
      },

      showMenu() {
        this.runCommand('ls', () => {
          this.openDirectory('');
          this.history = [];
        });
      },

      async fetchText(src) {
        const url = `${src}?t=${Date.now()}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load ${src}`);
        return await res.text();
      },

      async openNode(item) {
        this.pushHistory();

        if (item.type === 'dir') {
          this.runCommand(`ls ${this.commandPath(item.path)}/`, () => {
            this.openDirectory(item.path);
          });
          return;
        }

        if (item.type === 'file') {
          this.runCommand(`cat ${this.commandPath(item.path)}`, async () => {
            try {
              const body = await this.fetchText(item.src);
              this.screen = 'subpage';
              this.currentPath = this.parentPath(item.path);
              this.currentNodes = [];
              this.subpageHeader = item.label;
              this.subpageBody = body;
              this.subpageHtml = window.renderTerminalMarkdown(body, item.src);
              this.subpageAssets = [];
            } catch (err) {
              this.screen = 'subpage';
              this.currentPath = this.parentPath(item.path);
              this.currentNodes = [];
              this.subpageHeader = 'error.log';
              this.subpageBody = `impossibile caricare ${item.src}`;
              this.subpageHtml = `<p>impossibile caricare ${item.src}</p>`;
              this.subpageAssets = [];
            }
          });
          return;
        }

        if (item.type === 'lnk') {
          this.history.pop();
          window.history.back();
          window.open(item.href, '_blank', 'noopener,noreferrer');
          return;
        }

        if (item.type === 'action' && item.action === 'telegram') {
          this.runCommand('curl t.me/mes3hacklab', () => {
            this.screen = 'subpage';
            this.currentPath = '/contacts';
            this.currentNodes = [];
            this.subpageHeader = 'telegram.lnk';
            this.subpageBody = '';
            this.subpageHtml = '<p>403. Try asking.</p>';
            this.subpageAssets = [];
          });
        }

        if (item.type === 'download') this.openPopup(item.event, `${item.path}.ics`);
      },

      eventSafeName(event) {
        return `${event.dateStr}-${event.startStr}_${event.endStr}-${event.title}`
          .toLowerCase()
          .replace(/[^a-z0-9:_]+/g, '-')
          .replace(/^-+|-+$/g, '');
      },

      getTimestamp() {
        return new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z/, '');
      },
    }
  }
