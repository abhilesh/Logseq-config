// Show day of week and week number on all visible journal page titles.
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
    let scheduled = false;

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

    function candidateText(el) {
      return Array.from(el.childNodes)
        .filter(
          (node) =>
            node.nodeType === Node.TEXT_NODE ||
            (node.nodeType === Node.ELEMENT_NODE &&
              !node.classList.contains(INFO_CLASS))
        )
        .map((node) => node.textContent)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function titleCandidates() {
      const candidates = Array.from(document.body.querySelectorAll("*"))
        .filter((el) => {
          if (!visibleElement(el) || el.closest(SIDEBAR_SELECTOR)) return false;

          const text = candidateText(el);
          if (!JOURNAL_DATE_RE.test(text)) return false;
          if (text.length >= 40) return false;

          const styles = window.getComputedStyle(el);
          const fontSize = parseFloat(styles.fontSize || "0");
          const tagName = el.tagName.toLowerCase();

          return (
            fontSize >= 20 ||
            ["h1", "h2", "h3"].includes(tagName) ||
            el.matches('[class*="title"], [class*="page"]')
          );
        });

      return candidates.filter(
        (candidate) =>
          !candidates.some(
            (other) => other !== candidate && candidate.contains(other)
          )
      );
    }

    function addInfo(title) {
      if (!title) return;

      const journalDate = journalDateFromText(candidateText(title));
      if (!journalDate || Number.isNaN(journalDate.getTime())) return;

      const label = ` ${journalDate.toLocaleString("default", {
        weekday: "long",
      })}, Week ${weekNumber(journalDate)}`;
      const existing = title.querySelector(`:scope > .${INFO_CLASS}`);
      if (existing) {
        existing.textContent = label;
        return;
      }

      const span = document.createElement("span");
      span.className = INFO_CLASS;
      span.style = "opacity:0.5;font-size:0.7em;margin-left:0.35em";
      span.textContent = label;
      title.append(span);
    }

    function insertInfo() {
      const candidates = new Set(titleCandidates());
      document.querySelectorAll(`.${INFO_CLASS}`).forEach((el) => {
        if (!candidates.has(el.parentElement)) el.remove();
      });
      candidates.forEach(addInfo);
    }

    function scheduleInsertInfo() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        insertInfo();
      });
    }

    insertInfo();
    setInterval(insertInfo, 2000);
    new MutationObserver(scheduleInsertInfo).observe(document.body, {
      childList: true,
      subtree: true,
    });
  })();
