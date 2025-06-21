import { useEffect, useState } from "react";
import "./scss/sidebar.scss";
import { Link } from "react-router";

function Sidebar({ tabs, setTabIndex, tabIndex }) {
  const [count, setCount] = useState(0);

  function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggleButton = document.getElementById("toggle-btn");

    sidebar.classList.toggle("close");
    toggleButton.classList.toggle("rotate");
    closeAllSubMenus();
  }
    
  function closeAllSubMenus() {
    const sidebar = document.getElementById("sidebar");

    Array.from(sidebar.getElementsByClassName("show")).forEach((ul) => {
      ul.classList.remove("show");
      ul.previousElementSibling.classList.remove("rotate");
    });
  }

  function toggleSubMenu(e) {
    let button = e.target;
    // recursive find parent button of e or get e if e is button
    while (!button.classList.contains("dropdown-btn")) {
      button = button.parentElement;
    }

    if (!button.nextElementSibling.classList.contains("show")) {
      closeAllSubMenus();
    }
    button.nextElementSibling.classList.toggle("show");
    button.classList.toggle("rotate");
    const sidebar = document.getElementById("sidebar");
    if (sidebar.classList.contains("close")) {
      sidebar.classList.toggle("close");
      toggleButton.classList.toggle("rotate");
    }
  }

  return (
    <>
      <nav id="sidebar">
        <ul>
          <li>
            <span class="logo">Menu</span>
            <button onClick={() => toggleSidebar()} id="toggle-btn">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#e8eaed"
              >
                <path d="m313-480 155 156q11 11 11.5 27.5T468-268q-11 11-28 11t-28-11L228-452q-6-6-8.5-13t-2.5-15q0-8 2.5-15t8.5-13l184-184q11-11 27.5-11.5T468-692q11 11 11 28t-11 28L313-480Zm264 0 155 156q11 11 11.5 27.5T732-268q-11 11-28 11t-28-11L492-452q-6-6-8.5-13t-2.5-15q0-8 2.5-15t8.5-13l184-184q11-11 27.5-11.5T732-692q11 11 11 28t-11 28L577-480Z" />
              </svg>
            </button>
          </li>
          {Object.keys(tabs).map((key) => {
            return (
              <li
                key={key}
                onClick={() => setTabIndex(key)}
                className={tabIndex == key ? "active" : ""}
              >
                <Link to={tabs[key].href}>
                  {tabs[key].icon}
                  <span>{tabs[key].name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

export default Sidebar;
