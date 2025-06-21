import { useState } from "react";
import CameraDrawer from "./Camera/CameraDrawer";
import CameraConnect from "./Camera/CameraConnect";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import ConfigSidebar from "../components/ConfigSidebar/configSidebar";
import CameraList from "./Camera/CameraList";
import AddCameraForm from "./Camera/AddCameraForm";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function CameraManager() {
  const [count, setCount] = useState(0);
  const [value, setValue] = useState(0);
  const [compIndex, setCompIndex] = useState(1);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  console.log("CameraManager");
  return (
    <>
      <div className="flex flex-col flex-1 position-relative">
        <Routes>
          <Route path="/cameras/add" element={<AddCameraForm mode="add" />} />
          <Route
            path="edit/:id/info"
            element={<AddCameraForm mode="edit" />}
          />
          <Route path="/" element={<CameraList />} />
        </Routes>

        {/* <AddCameraForm /> */}
      </div>
    </>
  );
}

export default CameraManager;
