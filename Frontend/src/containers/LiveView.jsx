import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import FullscreenIcon from "@mui/icons-material/Fullscreen";

function LiveView({ areaCameras, handleFocusView }) {
  // Danh sách tên areaCameras và ID
  const [focusedKey, setFocusedKey] = useState(null);
  const cameraIds = ["01", "02", "03", "04"];

  const videoRefs = useRef({});

  const handleFocus = (key) => {
    setFocusedKey(key);
    handleFocusView(key);
  };

  const handleUnfocus = () => {
    setFocusedKey(null);
    handleFocusView(null);

  };
  const initHls = (video, src) => {
    if (!video) return null;

    let hls;
    if (Hls.isSupported()) {
      hls = new Hls();

      hls.on(Hls.Events.FRAG_CHANGED, () => {
        if (hls) {
          hls.nextLevel = hls.currentLevel;
        }
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play();
    } else {
      console.error("HLS is not supported in this browser.");
    }

    return hls;
  };
  useEffect(() => {
    const hlsInstances = [];
    console.log("areaCameras" , areaCameras)

    areaCameras.forEach((cam) => {
        let cameras = [...cameraIds]
        if (cam === "LH-HV-LL") {
            cameras = [...cameras, "05", "06"];
        }
        console.log("cameras" , cameras)

        cameras.forEach((id) => {
        const key = `${cam}_CAM-${id}`;
        const src = `${import.meta.env.VITE_APP_HLS_DOMAIN}:${import.meta.env.VITE_APP_HLS_PORT}/stream/ai/${key}/hls/live/index.m3u8`;
        const video = videoRefs.current[key];

        if (video) {
          const hls = initHls(video, src);
          if (hls) hlsInstances.push(hls);
        }
      });
    });
    handleUnfocus();
    return () => {
      hlsInstances.forEach((hls) => hls.destroy());
    };
  }, [areaCameras]);
  return (
<div className="p-4 flex flex-row flex-wrap overflow-hidden w-full h-full justify-center items-start">
      {areaCameras.map((cam) =>

        {
            let cameras = [...cameraIds]
            if (cam === "LH-HV-LL") {
                cameras = [...cameras, "05", "06"];

            }
            return cameras.map((id) => {
                const key = `${cam}_CAM-${id}`;
                return (
                  <div
                  key={key}
                  className={`relative group ${
                    focusedKey && focusedKey !== key ? "hidden" : "block"
                  }`}
                >
                  <div
                    className="absolute top-[30%] right-[47%] z-10 bg-black bg-opacity-10 p-2 rounded-full cursor-pointer hidden group-hover:block"
                    onClick={() =>
                      focusedKey ? handleUnfocus() : handleFocus(key)
                    }
                  >
                    <FullscreenIcon style={{ color: "white" }} />
                  </div>
                
                  <video
                    ref={(el) => (videoRefs.current[key] = el)}
                    className={`${
                      focusedKey === key ? "w-[100%] h-[600px]" : "w-[250px] h-[150px]"
                    } bg-black mr-4 mb-4`}
                    controls
                    playsInline
                    autoPlay
                    muted
                  ></video>
                  <p className="text-black text-sm">{key}</p>
                </div>
                
                );
              })
        }
      )}
    </div>
  );
}

export default LiveView;
