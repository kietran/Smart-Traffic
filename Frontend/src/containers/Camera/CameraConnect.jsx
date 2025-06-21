import React, { useMemo, useRef, useState, useEffect } from "react";
import PolygonAnnotation from "../../components/AnnotationDrawer/PolygonAnnotation";
import { Stage, Layer, Image } from "react-konva";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import "./scss/CameraConnect.scss";
import UndoIcon from "@mui/icons-material/Undo";
import BlockIcon from "@mui/icons-material/Block";
import Button from "@mui/material/Button";
import ConfigSidebar from "../../components/ConfigSidebar/configSidebar";
import DataTable from "../../components/Table";

const videoSource = "./no-available.png";
const wrapperStyle = {
    display: "flex",
    justifyContent: "center",
    marginTop: 20,
    backgroundColor: "transparent",
};

const camera_list_org = [
    { name: "camera1", rtsp: "http://", image_url: videoSource },
    { name: "camera2", rtsp: "http://", image_url: videoSource },
    { name: "camera3", rtsp: "http://", image_url: videoSource },
    { name: "camera4", rtsp: "http://", image_url: videoSource },
    { name: "camera5", rtsp: "http://", image_url: videoSource },
    { name: "camera6", rtsp: "http://", image_url: videoSource },
    { name: "camera7", rtsp: "http://", image_url: videoSource },
];
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

const columns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "source", headerName: "Source name", width: 160 },
    { field: "source-direction", headerName: "Source direction", width: 160 },
    { field: "destination", headerName: "Destination name", width: 160 },
    {
        field: "destination-direction",
        headerName: "Destination direction",
        width: 160,
    },
];

const rows = [
    { id: 1, lastName: "Snow", firstName: "Jon", age: 35 },
    { id: 2, lastName: "Lannister", firstName: "Cersei", age: 42 },
];

const CameraConnect = () => {
    const [image, setImage] = useState();
    const [imageConnected, setImageConnected] = useState();
    const [points, setPoints] = useState([]);
    const [pointsChoose, setPointsChoose] = useState([]);
    const [polygonIndexConnect, setPolygonIndexConnect] = useState(-1);
    const [polygonIndex, setPolygonIndex] = useState(-1);
    const [size, setSize] = useState({});
    const [flattenedPoints, setFlattenedPoints] = useState();
    const [position, setPosition] = useState([0, 0]);
    const [isPolyComplete, setPolyComplete] = useState(false);
    const [connectCamera, setConnectCamera] = useState(null);
    const [camera_list, setCameraList] = useState(camera_list_org);
    const [directionConnect, setDirectionConnect] = useState("");
    const [direction, setDirection] = useState("");

    const imageRef = useRef(videoSource);
    const imageConnectedRef = useRef(null);

    const videoElement = useMemo(() => {
        const element = new window.Image();
        element.width = 540;
        element.height = 360;
        element.src = videoSource;
        return element;
    }, [videoSource]);

    const loadConnectedCameraImage = (camera) => {
        const element = new window.Image();
        element.width = 540;
        element.height = 360;
        element.src = camera.image_url;
        element.onload = () => {
            imageConnectedRef.current = element;
        };
        setImageConnected(element);
    };

    useEffect(() => {
        if (connectCamera) {
            loadConnectedCameraImage(connectCamera);
        }
    }, [connectCamera]);

    useEffect(() => {
        const onload = () => {
            setSize({ width: videoElement.width, height: videoElement.height });
            setImage(videoElement);
            imageRef.current = videoElement;
        };
        videoElement.addEventListener("load", onload);
        return () => {
            videoElement.removeEventListener("load", onload);
        };
    }, [videoElement]);

    const getMousePos = (stage) => [
        stage.getPointerPosition().x,
        stage.getPointerPosition().y,
    ];

    useEffect(() => {
        setFlattenedPoints(
            points
                .concat(isPolyComplete ? [] : position)
                .reduce((a, b) => a.concat(b), [])
        );
    }, [points, isPolyComplete, position]);

    const undo = () => {
        setPoints(points.slice(0, -1));
        setPolyComplete(false);
        setPosition(points[points.length - 1]);
    };

    const reset = () => {
        setPoints([]);
    };
    const saveConfig = () => {
        setPoints([]);
    };

    return (
        <>
            <div className="flex flex-col">
                <div style={wrapperStyle}>
                    <div>
                        <Stage
                            width={size.width || 650}
                            height={size.height || 302}
                        >
                            <Layer>
                                <Image
                                    ref={imageRef}
                                    image={image}
                                    x={0}
                                    y={0}
                                    width={size.width}
                                    height={size.height}
                                />
                                <PolygonAnnotation
                                    points={points}
                                    flattenedPoints={flattenedPoints}
                                    handlePointDragMove={() => {}}
                                    handleGroupDragEnd={() => {}}
                                    handleMouseOverStartPoint={() => {}}
                                    handleMouseOutStartPoint={() => {}}
                                    isFinished={false}
                                />
                                {pointsChoose.length > 0 && (
                                    <PolygonAnnotation
                                        points={pointsChoose}
                                        polygonIndex={polygonIndex}
                                        color="#FF019A"
                                        flattenedPoints={pointsChoose.reduce(
                                            (a, b) => a.concat(b),
                                            []
                                        )}
                                        handlePointDragMove={() => {}}
                                        handleGroupDragEnd={() => {}}
                                        handleMouseOverStartPoint={() => {}}
                                        handleMouseOutStartPoint={() => {}}
                                        isFinished={false}
                                    />
                                )}
                            </Layer>
                        </Stage>
                        <div className="flex justify-start mt-5 gap-2">
                            <Button
                                variant={
                                    direction === "in"
                                        ? "contained"
                                        : "outlined"
                                }
                                onClick={() => setDirection("in")}
                            >
                                IN
                            </Button>
                            <Button
                                variant={
                                    direction === "out"
                                        ? "contained"
                                        : "outlined"
                                }
                                onClick={() => setDirection("out")}
                            >
                                OUT
                            </Button>
                        </div>
                    </div>

                    <div
                        style={{
                            marginLeft: 20,
                            position: "relative",
                            flex: 1,
                            width: size.width,
                            height: size.height,
                        }}
                    >
                        <div
                            className={`upload overflow-y-auto flex items-center flex-wrap justify-between ${
                                connectCamera ? "hidden" : ""
                            }`}
                        >
                            {camera_list.map((camera, index) => (
                                <img
                                    key={index}
                                    className="hover:cursor-pointer hover:border-1 hover:border-dashed hover:border-black transition-all duration-300"
                                    style={{
                                        width: 150,
                                        height: 150,
                                        margin: 10,
                                        display: "block",
                                        borderRadius: 6,
                                        borderWidth: 1,
                                    }}
                                    onDoubleClick={() =>
                                        setConnectCamera(camera)
                                    }
                                    src={camera.image_url}
                                    alt=""
                                />
                            ))}
                        </div>

                        <div
                            className={`${connectCamera ? "block" : "hidden"}`}
                        >
                            <Stage
                                width={size.width || 650}
                                height={size.height || 302}
                            >
                                <Layer>
                                    <Image
                                        ref={imageConnectedRef}
                                        image={imageConnected}
                                        x={0}
                                        y={0}
                                        width={size.width}
                                        height={size.height}
                                    />
                                    {Object.entries(data_points.line).map(
                                        ([key, value], index) => (
                                            <PolygonAnnotation
                                                points={value}
                                                color={
                                                    polygonIndexConnect === key
                                                        ? "#FF019A"
                                                        : "#00F1FF"
                                                }
                                                polygonIndex={key}
                                                flattenedPoints={value.reduce(
                                                    (a, b) => a.concat(b),
                                                    []
                                                )}
                                                handlePointDragMove={() => {}}
                                                handleGroupDragEnd={() => {}}
                                                handleMouseOverStartPoint={() => {}}
                                                handleMouseOutStartPoint={() => {}}
                                                isFinished={false}
                                                setPolygonIndexConnect={
                                                    setPolygonIndexConnect
                                                }
                                            />
                                        )
                                    )}
                                </Layer>
                            </Stage>
                            <span
                                className="absolute top-0 right-0 p-2"
                                onClick={() => {
                                    setConnectCamera(null);
                                    setPolygonIndexConnect(-1);
                                }}
                            >
                                <RemoveCircleIcon
                                    sx={{
                                        fontSize: 34,
                                        color: "black",
                                        cursor: "pointer",
                                        ":hover": { color: "gray" },
                                    }}
                                />
                            </span>
                        </div>
                        <div className="flex justify-start mt-5 gap-2">
                            <Button
                                variant={
                                    directionConnect === "in"
                                        ? "contained"
                                        : "outlined"
                                }
                                onClick={() => setDirectionConnect("in")}
                            >
                                IN
                            </Button>
                            <Button
                                variant={
                                    directionConnect === "out"
                                        ? "contained"
                                        : "outlined"
                                }
                                onClick={() => setDirectionConnect("out")}
                            >
                                OUT
                            </Button>
                        </div>
                    </div>
                </div>
                <Button variant="contained" onClick={() => saveConfig()}>
                    Save
                </Button>
                <div className="flex-1 overflow-auto">
                    <DataTable columns={columns} rows={rows} />
                </div>
            </div>
            <ConfigSidebar
                setPoints={setPoints}
                setPointsChoose={setPointsChoose}
                setPolygonIndex={setPolygonIndex}
            />
        </>
    );
};

export default CameraConnect;
