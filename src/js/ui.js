import debounce from "./utils/debounce.js";

const MOBILE_SIZE = 768;
const MINIMENU = "minimenu";

class AdminiUi {
  constructor() {
    this.sidebar = document.querySelector("#sidebar");
  }

  /**
   * The minimenu behaviour of the sidebar is controlled by a toggle
   * We store the state in the localStorage so that user preference is preserved
   */
  minimenu() {
    // Class can be added serverside to avoid layout shift on load
    if (localStorage.getItem(MINIMENU) && !document.body.classList.contains(MINIMENU)) {
      document.body.classList.add(MINIMENU);
    }

    document.querySelectorAll(".js-sidebar-toggle").forEach((el) => {
      el.addEventListener("click", (ev) => {
        ev.preventDefault();

        document.body.classList.toggle(MINIMENU);
        if (document.body.classList.contains(MINIMENU)) {
          localStorage.setItem(MINIMENU, 1);
        } else {
          localStorage.removeItem(MINIMENU);
          const cta = document.querySelector(".sidebar-cta-content");
          if (cta) {
            cta.style.cssText = "";
          }
        }
        document.activeElement.blur();
      });
    });
  }

  /**
   * Enable all tooltips by default
   * You can also use the bs-toggle custom element
   */
  tooltips() {
    if (!bootstrap.Tooltip) {
      return;
    }
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
      if (!el.hasAttribute("title")) {
        el.setAttribute("title", el.innerText.trim());
      }
      bootstrap.Tooltip.getOrCreateInstance(el);
    });
  }

  /**
   * Sidebar layout is controlled with offcanvas but we may need to restore
   * visibility if it was hidden
   * @param {int} w
   * @return {bootstrap.Offcanvas|null}
   */
  toggleSidebar(w = null) {
    if (w === null) {
      w = window.innerWidth;
    }
    if (w > MOBILE_SIZE) {
      // A simple fix in case we resized the window and the menu was hidden by offcanvas
      this.sidebar.style.visibility = "visible";
      this.sidebar.classList.remove("offcanvas");
    }
    // BSN does not init offcanvas like BS5
    if (w <= MOBILE_SIZE) {
      this.sidebar.classList.add("offcanvas");
      const sidebarOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(this.sidebar);
      return sidebarOffcanvas;
    }
    return null;
  }

  /**
   * Register js behaviour that augment response behaviour
   */
  responsive() {
    window.addEventListener(
      "resize",
      debounce(() => {
        this.toggleSidebar(window.innerWidth);
        this.setMobileSize();
      })
    );
  }

  /**
   * Dismissable alerts with an id will be stored in a localStorage
   */
  dismissableAlerts() {
    document.querySelectorAll(".alert-dismissible[id]").forEach((el) => {
      let dismissed = localStorage.getItem("dismissed_alerts");
      dismissed = dismissed ? JSON.parse(dismissed) : [];
      if (dismissed.includes(el.getAttribute("id"))) {
        el.style.display = "none";
      }
      el.addEventListener(
        "closed.bs.alert",
        () => {
          dismissed.push(el.getAttribute("id"));
          localStorage.setItem("dismissed_alerts", JSON.stringify(dismissed));
        },
        { once: true }
      );
    });
  }

  /**
   * Create test from html. To create toast from js, use toaster
   */
  toasts() {
    let list = document.querySelectorAll(".toast:not(.toaster)");
    list.forEach((el) => {
      let toast = bootstrap.Toast.getOrCreateInstance(el);
      toast.show();
    });
  }

  /**
   * @link https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
   */
  setMobileSize() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  }

  /**
   * For dropdowns not using the bs-toggle
   */
  simpleDropdowns() {
    document.querySelectorAll(".dropdown-toggle:not([data-bs-toggle])").forEach((el) => {
      const menu = el.parentElement.querySelector(".dropdown-menu");
      const isDropup = el.parentElement.classList.contains("dropup");
      el.ariaExpanded = menu.classList.contains("show");
      el.addEventListener("click", (e) => {
        menu.classList.toggle("show");
        el.ariaExpanded = menu.classList.contains("show");
        // Dropup need some love
        if (isDropup) {
          menu.style.transform = "translateY(calc(-100% - " + el.offsetHeight + "px))";
        }
        // Another click should trigger blur
        if (!menu.classList.contains("show")) {
          document.activeElement.blur();
        }
        // Trigger positioning
        if (menu.classList.contains("dropdown-fixed")) {
          menu.dispatchEvent(new CustomEvent("show.bs.dropdown"));
        }
      });
      el.addEventListener("blur", (e) => {
        menu.classList.remove("show");
      });

      // Fixed strategy
      if (menu.classList.contains("dropdown-fixed")) {
        this.attachPosition(menu, (scroll) => {
          if (isDropup) {
            menu.style.transform = "translate(-" + scroll[0] + "px, calc(-100% - " + (el.offsetHeight + scroll[1]) + "px))";
          } else {
            menu.style.transform = "translate(-" + scroll[0] + "px, -" + scroll[1] + "px)";
          }
        });
      }
    });

    // Alternative triggers for dropdowns
    document.querySelectorAll(".dropdown-alias").forEach((el) => {
      const menu = el.parentElement.querySelector(".dropdown-menu");
      el.addEventListener("click", (e) => {
        menu.classList.toggle("show");
      });
    });
  }

  attachPosition(el, callback) {
    const fn = debounce((e) => {
      if (!el.offsetHeight) {
        return;
      }
      const scroll = this.getScrollPosition(el);
      callback(scroll);
    }, 0);
    const scroll = this.getScrollPosition(el);
    callback(scroll);
    el.addEventListener("show.bs.dropdown", fn);
    document.addEventListener("resize", fn);
    document.addEventListener("scroll", fn);
    scroll[2].forEach((parent) => {
      parent.addEventListener("scroll", fn);
    });
  }

  /**
   * @param {HTMLElement} el
   * @returns {Array} x,y,parents
   */
  getScrollPosition(el) {
    let scrollableParents = [];
    let parent = el.parentElement;
    let scroll = [0, 0, scrollableParents];
    while (parent && parent instanceof HTMLElement) {
      const styles = getComputedStyle(parent);
      let s = false;
      if (styles.overflowX == "auto" || styles.overflowX == "scroll") {
        scroll[0] += parent.scrollLeft;
        s = true;
      }
      if (styles.overflowY == "auto" || styles.overflowY == "scroll") {
        scroll[1] += parent.scrollTop;
        s = true;
      }
      if (s && !["BODY", "HTML"].includes(parent.tagName)) {
        scrollableParents.push(parent);
      }
      parent = parent.parentElement;
    }
    return scroll;
  }

  init() {
    this.setMobileSize();
    this.minimenu();
    this.tooltips();
    this.responsive();
    this.dismissableAlerts();
    this.toasts();
    this.toggleSidebar();
    this.simpleDropdowns();
  }
}

export default AdminiUi;
