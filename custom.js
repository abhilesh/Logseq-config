// Show day of week and week number on main journal page titles only.
(function () {
    const INFO_CLASS = "journal-date-info";
    const SIDEBAR_SELECTOR = [
      "#left-sidebar",
      "#right-sidebar",
      ".left-sidebar",
      ".right-sidebar",
      ".sidebar",
      ".cp__sidebar-left",
      ".cp__right-sidebar",
      ".nav-contents-container",
      ".nav-content-item",
      ".recent",
      ".recent-item",
      ".favorites",
    ].join(",");
    const JOURNAL_DATE_RE =
      /([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th),\s+(\d{4})/;

    function removeExistingInfo() {
      document.querySelectorAll(`.${INFO_CLASS}`).forEach((el) => {
        el.remove();
      });
    }

    function journalDateFromText(text) {
      const match = JOURNAL_DATE_RE.exec(text.trim());
      if (!match) return null;

      return new Date(`${match[1]} ${match[2]} ${match[3]}`);
    }

    function weekNumber(date) {
      const startDate = new Date(date.getFullYear(), 0, 1);
      const days = Math.floor((date - startDate) / (24 * 60 * 60 * 1000));
      return Math.ceil((days + 1) / 7);
    }

    function visibleElement(el) {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    function directText(el) {
      return Array.from(el.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join(" ")
        .trim();
    }

    function candidateText(el) {
      return directText(el);
    }

    function mainTitleCandidate() {
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const candidates = Array.from(document.body.querySelectorAll("*"))
        .filter((el) => {
          if (el.querySelector(`.${INFO_CLASS}`)) return false;
          if (!visibleElement(el) || el.closest(SIDEBAR_SELECTOR)) return false;

          const rect = el.getBoundingClientRect();
          if (rect.left < Math.min(260, viewportWidth * 0.18)) return false;

          const text = candidateText(el);
          if (!JOURNAL_DATE_RE.test(text)) return false;

          return text.length < 40;
        })
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const styles = window.getComputedStyle(el);
          return {
            el,
            score:
              parseFloat(styles.fontSize || "0") * 10 +
              rect.height -
              Math.max(rect.top, 0) / 100,
          };
        });

      return candidates.sort((a, b) => b.score - a.score)[0]?.el;
    }

    function addInfo(title) {
      if (!title) return;

      const journalDate = journalDateFromText(candidateText(title));
      if (!journalDate || Number.isNaN(journalDate.getTime())) return;

      const span = document.createElement("span");
      span.className = INFO_CLASS;
      span.style = "opacity:0.5;font-size:0.7em;margin-left:0.35em";
      span.textContent = ` ${journalDate.toLocaleString("default", {
        weekday: "long",
      })}, Week ${weekNumber(journalDate)}`;
      title.append(span);
    }

    function insertInfo() {
      removeExistingInfo();
      addInfo(mainTitleCandidate());
    }

    insertInfo();
    setInterval(insertInfo, 1000);
  })();
