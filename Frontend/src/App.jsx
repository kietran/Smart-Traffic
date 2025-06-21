import { useState , useEffect} from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import Sidebar from "./components/sidebar";
import ConfigurePage from "./containers/ConfigurePage";
import CameraManager from "./containers/CameraManager";
import DashboardManager from "./containers/Dashboard/DashboardManager";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { NotificationsProvider } from "@toolpad/core/useNotifications";
import CameraList from "./containers/Camera/CameraList";
import AddCameraForm from "./containers/Camera/AddCameraForm";

function App() {
  const [count, setCount] = useState(0);
  const [tabIndex, setTabIndex] = useState(0);
    useEffect(() => {
        // get url 
    const url = window.location.href;
    if (url.includes("cameras")) {
        setTabIndex(1)
    }
    }, [])
  const tabs = {
    0: {
      name: "Home",
      href: "/home",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
          fill="#e8eaed"
        >
          <path d="M240-200h120v-200q0-17 11.5-28.5T400-440h160q17 0 28.5 11.5T600-400v200h120v-360L480-740 240-560v360Zm-80 0v-360q0-19 8.5-36t23.5-28l240-180q21-16 48-16t48 16l240 180q15 11 23.5 28t8.5 36v360q0 33-23.5 56.5T720-120H560q-17 0-28.5-11.5T520-160v-200h-80v200q0 17-11.5 28.5T400-120H240q-33 0-56.5-23.5T160-200Zm320-270Z" />
        </svg>
      ),
      component: <DashboardManager />,

    },
    1: {
      name: "Camera",
      href: "/cameras",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
          fill="#e8eaed"
        >
          <path d="M520-640v-160q0-17 11.5-28.5T560-840h240q17 0 28.5 11.5T840-800v160q0 17-11.5 28.5T800-600H560q-17 0-28.5-11.5T520-640ZM120-480v-320q0-17 11.5-28.5T160-840h240q17 0 28.5 11.5T440-800v320q0 17-11.5 28.5T400-440H160q-17 0-28.5-11.5T120-480Zm400 320v-320q0-17 11.5-28.5T560-520h240q17 0 28.5 11.5T840-480v320q0 17-11.5 28.5T800-120H560q-17 0-28.5-11.5T520-160Zm-400 0v-160q0-17 11.5-28.5T160-360h240q17 0 28.5 11.5T440-320v160q0 17-11.5 28.5T400-120H160q-17 0-28.5-11.5T120-160Zm80-360h160v-240H200v240Zm400 320h160v-240H600v240Zm0-480h160v-80H600v80ZM200-200h160v-80H200v80Zm160-320Zm240-160Zm0 240ZM360-280Z" />
        </svg>
      ),
      component: <CameraManager />,
    },
    2: {
      name: "Configure",
      href: "/configure",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
          fill="#e8eaed"
        >
          <path d="M520-640v-160q0-17 11.5-28.5T560-840h240q17 0 28.5 11.5T840-800v160q0 17-11.5 28.5T800-600H560q-17 0-28.5-11.5T520-640ZM120-480v-320q0-17 11.5-28.5T160-840h240q17 0 28.5 11.5T440-800v320q0 17-11.5 28.5T400-440H160q-17 0-28.5-11.5T120-480Zm400 320v-320q0-17 11.5-28.5T560-520h240q17 0 28.5 11.5T840-480v320q0 17-11.5 28.5T800-120H560q-17 0-28.5-11.5T520-160Zm-400 0v-160q0-17 11.5-28.5T160-360h240q17 0 28.5 11.5T440-320v160q0 17-11.5 28.5T400-120H160q-17 0-28.5-11.5T120-160Zm80-360h160v-240H200v240Zm400 320h160v-240H600v240Zm0-480h160v-80H600v80ZM200-200h160v-80H200v80Zm160-320Zm240-160Zm0 240ZM360-280Z" />
        </svg>
      ),
      component: <ConfigurePage />,
    },
  };
  return (
    <>
      <>
        <SnackbarProvider
          maxSnack={3}
          autoHideDuration={2000}
          preventDuplicate
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <NotificationsProvider>
            <div className="main-wrapper w-screen flex  overflow-hidden">
              <Sidebar
                tabs={tabs}
                setTabIndex={setTabIndex}
                tabIndex={tabIndex}
              />
                <div className="p-0 flex-1 h-screen overflow-auto text-black">
                <Routes>
                    <Route path="/cameras/add" element={<AddCameraForm mode="add" />} />
                    <Route
                    path="/cameras/edit/:id/info"
                    element={<AddCameraForm mode="edit" />}
                    />
                    <Route path="/cameras" element={<CameraList />} />
                    <Route
                        path="/configure"
                        element={tabs[2].component}
                    />
                    <Route path="/*" element={tabs[0].component} />

                </Routes>
                </div>
    
            </div>
          </NotificationsProvider>
        </SnackbarProvider>
      </>
    </>
  );
}

export default App;
