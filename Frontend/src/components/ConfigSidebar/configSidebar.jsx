import { useEffect, useState } from "react";
import "./scss/configSidebar.scss";
import Checkbox from "@mui/material/Checkbox";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { styled } from "@mui/material/styles";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import svg from "../../assets/delete-svgrepo-com.svg";
const label = { inputProps: { "aria-label": "Checkbox demo" } };

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

let data_points = {
  line: {
    0: [
      [0, 0],
      [300, 300],
    ],
    1: [
      [0, 0],
      [200, 400],
    ],
    2: [
      [0, 0],
      [400, 500],
    ],
  },
  zone: {
    0: [
      [0, 0],
      [300, 300],
      [100, 100],
      [400, 400],
    ],
    1: [
      [0, 0],
      [300, 300],
      [100, 100],
      [400, 400],
    ],
    2: [
      [0, 0],
      [200, 400],
      [100, 100],
      [400, 400],
    ],
    3: [
      [0, 0],
      [400, 500],
      [100, 100],
      [400, 400],
    ],
  },
};

const style = {
  py: 0,
  width: "100%",
  maxWidth: 360,
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
  backgroundColor: "background.paper",
};

function ConfigSidebar({ setPoints, setPointsChoose, setPolygonIndex }) {
  const [lines, addLines] = useState(data_points.line);
  const [focusLine, setFocusLine] = useState(null);
  const [focusZone, setFocusZone] = useState(null);

  function choosePolygon(type, index) {
    if (type === "line") {
      setPointsChoose(data_points.line[index]);
      setFocusLine(index);
      setPolygonIndex(index);
    } else {
      setPointsChoose(data_points.zone[index]);
      setFocusZone(index);
      setPolygonIndex(index);
    }
  }
  function toggleSubMenu(e) {
    let button = e.target;
    while (!button.classList.contains("dropdown-btn")) {
      button = button.parentElement;
    }
    if (["path", "svg"].includes(e.target.tagName.toLowerCase())) {
      button.nextElementSibling.classList.add("show");
      button.classList.add("rotate");
      const total = document
        .getElementById("line-list")
        .getElementsByTagName("li").length;

      addLines([...lines, `line${total + 1}`]);
      setFocusLine(lines.length);
      return;
    }

    button.nextElementSibling.classList.toggle("show");
    button.classList.toggle("rotate");
  }

  return (
    <>
      <nav className="w-3/12 config-sidebar" id="sidebar">
        <h2 className="text-white font-bold text-2xl text-center my-5 p-2  rounded-lg shadow-lg">
          Tool configuration
        </h2>
        <div className="tool-content">
          <div className="part-1">
            <button onClick={toggleSubMenu} class="dropdown-btn">
              <span>Lines</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#e8eaed"
              >
                <path d="M480-361q-8 0-15-2.5t-13-8.5L268-556q-11-11-11-28t11-28q11-11 28-11t28 11l156 156 156-156q11-11 28-11t28 11q11 11 11 28t-11 28L508-372q-6 6-13 8.5t-15 2.5Z" />
              </svg>
            </button>
            <ul class="sub-menu">
              <div id="line-list">
                {Object.entries(lines).map(([key, value], index) =>
                  focusLine === index ? (
                    <li
                      onMouseEnter={() => setPoints(data_points.line[index])}
                      onMouseLeave={() => setPoints([])}
                      className="bg-gray-700 px-3 mb-2 rounded-md flex items-center justify-between"
                    >
                      <a href="#">Line{key}</a>
                    </li>
                  ) : (
                    <li
                      onClick={() => choosePolygon("line", index)}
                      onMouseEnter={() => setPoints(data_points.line[index])}
                      onMouseLeave={() => setPoints([])}
                      className="flex px-3 mb-2 rounded-md items-center justify-between"
                    >
                      <a href="#">Line{key}</a>
                    </li>
                  )
                )}
              </div>
            </ul>
          </div>
          <div className="part-2">
            <button onClick={toggleSubMenu} class="dropdown-btn">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#e8eaed"
              >
                <path d="m221-313 142-142q12-12 28-11.5t28 12.5q11 12 11 28t-11 28L250-228q-12 12-28 12t-28-12l-86-86q-11-11-11-28t11-28q11-11 28-11t28 11l57 57Zm0-320 142-142q12-12 28-11.5t28 12.5q11 12 11 28t-11 28L250-548q-12 12-28 12t-28-12l-86-86q-11-11-11-28t11-28q11-11 28-11t28 11l57 57Zm339 353q-17 0-28.5-11.5T520-320q0-17 11.5-28.5T560-360h280q17 0 28.5 11.5T880-320q0 17-11.5 28.5T840-280H560Zm0-320q-17 0-28.5-11.5T520-640q0-17 11.5-28.5T560-680h280q17 0 28.5 11.5T880-640q0 17-11.5 28.5T840-600H560Z" />
              </svg>
              <span>Configure</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#e8eaed"
              >
                <path d="M480-361q-8 0-15-2.5t-13-8.5L268-556q-11-11-11-28t11-28q11-11 28-11t28 11l156 156 156-156q11-11 28-11t28 11q11 11 11 28t-11 28L508-372q-6 6-13 8.5t-15 2.5Z" />
              </svg>
            </button>
            <ul class="sub-menu">
              <div>
                <div className="mb-2">
                  <li className="flex items-center justify-between">
                    <a href="#">Enable in</a>
                    <Checkbox {...label} defaultChecked />
                  </li>
                  <li className="flex items-center justify-between">
                    <a href="#">Enable out</a>
                    <Checkbox {...label} defaultChecked />
                  </li>
                </div>

                <List sx={style}>
                  <Divider variant="middle" />
                </List>
                <div className="">
                  <h3 href="#" className="mt-5 mb-5 text-center font-semibold">
                    Connected
                  </h3>
                  <div className="grid grid-cols-2 text-center">
                    <div className="p-2">
                      <Button
                        component="label"
                        role={undefined}
                        variant="contained"
                        tabIndex={-1}
                        startIcon={<AddCircleIcon />}
                      >
                        IN
                      </Button>
                      <li className="flex items-center justify-between">
                        <a href="#">Line1</a>
                        <DeleteIcon />
                      </li>
                      <li className="flex items-center justify-between">
                        <a href="#">Line2</a>
                        <DeleteIcon />
                      </li>
                    </div>

                    <div className="p-2 border-l border-gray-200">
                      <Button
                        component="label"
                        role={undefined}
                        variant="contained"
                        tabIndex={-1}
                        startIcon={<AddCircleIcon />}
                      >
                        OUT
                      </Button>

                      <li className="flex items-center justify-between">
                        <a href="#">Line1</a>
                        <DeleteIcon />
                      </li>
                      <li className="flex items-center justify-between">
                        <a href="#">Line2</a>
                        <DeleteIcon />
                      </li>
                    </div>
                  </div>
                </div>
              </div>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}

export default ConfigSidebar;
