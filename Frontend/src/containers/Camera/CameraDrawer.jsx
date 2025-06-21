import React, { useMemo, useRef, useState, useEffect } from "react";
import PolygonAnnotation from "../../components/AnnotationDrawer/PolygonAnnotation";
import { Stage, Layer, Image } from "react-konva";
import "./scss/CameraDrawer.scss";
import UndoIcon from "@mui/icons-material/Undo";
import BlockIcon from "@mui/icons-material/Block";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DoneOutlineIcon from "@mui/icons-material/DoneOutline";
import { useParams } from "react-router";
import { apiGetFrame, apiUpdateCamera } from "../../connectDB/axios";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import { SnackbarProvider, useSnackbar } from "notistack";
import SearchOptionBar from "../../components/SearchOptionBar";
import DataTable from "../../components/Table";

const wrapperStyle = {
  display: "flex",
  justifyContent: "center",
  marginTop: 0,
  backgroundColor: "transparent",
  flexDirection: "column",
};

const camera_groups = [
  {
    id: 1,
    item_id: "group1",
    item_name: "group1",
    group: null,
  },
  {
    id: 2,
    item_id: "group2",
    item_name: "group2",
    group: null,
  },
];
const direction = [
  {
    id: 1,
    item_id: "in",
    item_name: "IN",
    group: null,
  },
  {
    id: 2,
    item_id: "out",
    item_name: "OUT",
    group: null,
  },
];
const columns = [
  { field: "source_group", headerName: "Source Group", width: 160 },
  { field: "source_line", headerName: "Source Line", width: 160 },
  { field: "source_direction", headerName: "Source Direction", width: 160 },
  { field: "target_group", headerName: "Target Group", width: 160 },
  { field: "target_line", headerName: "Target Line", width: 160 },
  { field: "target_direction", headerName: "Target Direction", width: 160 },
];

const org_rows = [
  {
    id: 1,
    source_group: "A",
    source_line: "1",
    source_direction: "in",
    target_group: "B",
    target_line: "2",
    target_direction: "out",
  },
  {
    id: 2,

    source_group: "A",
    source_line: "2",
    source_direction: "in",
    target_group: "B",
    target_line: "2",
    target_direction: "out",
  },
  {
    id: 3,
    source_group: "A",
    source_line: "3",
    source_direction: "in",
    target_group: "C",
    target_line: "2",
    target_direction: "out",
  },
];

const CameraDrawer = ({ serviceName, cameraId, applyCallback, data }) => {
  const [image, setImage] = useState(null);
  const [hoverPoints, setHoverPoints] = useState([]);
  const [points, setPoints] = useState([]);
  const [size, setSize] = useState({});
  const [flattenedPoints, setFlattenedPoints] = useState();
  const [hoverFlattenedPoints, setHoverFlattenedPoints] = useState();
  const [position, setPosition] = useState([0, 0]);
  const [isMouseOverPoint, setMouseOverPoint] = useState(false);
  const [isPolyComplete, setPolyComplete] = useState(false);
  const [lineFinished, setLineFinished] = useState([]);
  const [polygonFinished, setPolygonFinished] = useState([]);
  const [polygonManager, setPolygonManager] = useState({ });
  const [lineManager, setLineManager] = useState({ });
  const [focusItem, setFocusItem] = useState(0);
  const [itemListName, setItemListName] = useState([]);
  const [typeIndex, setTypeIndex] = useState(0);
  const [videoSource, setVideoSource] = useState("./no-available.png");
  const imageRef = useRef(null);
  const [rows, setRows] = useState(org_rows);
  const [drawRows, setDrawRows] = useState({});
  const { enqueueSnackbar } = useSnackbar();
    const width = 1000
    const height = 640
  useEffect(() => {
    setItemListName(
      typeIndex === 0 ? Object.keys(lineManager) : Object.keys(polygonManager)
    );
  }, [lineManager, polygonManager, typeIndex]);

  useEffect(() => {
    // reset();
    setFocusItem(0);
  }, [typeIndex]);

  const update_image = (videoSource) => {
    const element = new window.Image();
    element.width = width;
    element.height = height;
    element.src = videoSource;
    // trigger reload element

    setSize({ width: element.width, height: element.height });
    setImage(element);
    imageRef.current = element;
  };
  const clearData = () => {
    setSize({});
    setVideoSource("./no-available.png");
    setPoints([]);
    setPolyComplete(false);
    setHoverFlattenedPoints([]);
    setLineManager({});
    setPolygonManager({});
    setLineFinished([]);
    setPolygonFinished([]);
    setFocusItem(0);
    setImage(null);
    setHoverPoints([]);
    setFlattenedPoints([]);
    setRows([]);
    setDrawRows({});
    setItemListName([]);
    setTypeIndex(0);
    setPosition([0, 0]);
    setMouseOverPoint(false);

  };

  useEffect(() => {
    if (cameraId === null || serviceName === null) {
        clearData();
      return;
    }
    clearData()
    apiGetFrame({ id: cameraId })
      .then((response) => {
        const url = `data:image/png;base64,${response}`;
        setVideoSource(url);
        update_image(url);
      })
      .catch((error) => alert("Error loading image"));
    // reset all state
    //   setup lineManager and polygonManager

    let init_lines = {}
    let init_polygons = {}
    data[serviceName].lines.map((line, index) => {

        let start = [line.start[0]*(width), line.start[1]*(height)]
        let end = [line.end[0]*(width), line.end[1]*(height)]
        init_lines[line.name] = [start, end];
    })
    data[serviceName].polygons.map((polygon, index) => {
        init_polygons[polygon.name] = polygon.zone.map((points) => [points[0]*(width), points[1]*(height)]);
    })

    setLineManager(init_lines);
    setPolygonManager(init_polygons);
    setLineFinished(data[serviceName].lines.map((line, index) => line.name));
    setPolygonFinished(data[serviceName].polygons.map((polygon, index) => polygon.name));
    if (typeIndex === 0) {
      setFocusItem(data[serviceName].lines[0]?.name);
    } else {
        setFocusItem(data[serviceName].polygons[0]?.name);
    }
  }, [cameraId, serviceName]);

  
  const getMousePos = (stage) => [
    stage.getPointerPosition().x,
    stage.getPointerPosition().y,
  ];

  const handleMouseDown = (e) => {
    if (isPolyComplete) return;
    const stage = e.target.getStage();
    const mousePos = getMousePos(stage);
    if (typeIndex === 0) {
      if (points.length < 2) {
        setPoints([...points, mousePos]);
      }
      if (points.length === 1) {
        setPolyComplete(true);
      }
    } else {
      if (!isMouseOverPoint) {
        setPoints([...points, mousePos]);
      }

      if (points.length >= 2 && isMouseOverPoint) {
        setPolyComplete(true);
      }
    }
  };
  const completedDrawer = () => {
    if (typeIndex === 0) {
      if (points.length < 2) {
        alert("Please draw line with 2 points");
        return;
      }
      setLineManager({ ...lineManager, [focusItem]: points });
      setLineFinished([...lineFinished, focusItem]);
    } else {
      if (points.length < 3) {
        alert("Please draw zone with 3 points");
        return;
      }
      if (!isPolyComplete) {
        alert("Please complete the zone");
        return;
      }
      setPolygonManager({ ...polygonManager, [focusItem]: points });
      setPolygonFinished([...polygonFinished, focusItem]);
    }
  };

  const addItem = () => {
    if (typeIndex === 0) {
        let name = `line_${itemListName.length + 1}`;
      setLineManager({ ...lineManager, [name]: [] });
      setFocusItem(name);
    } else {
        let name = `zone_${itemListName.length + 1}`;
      setPolygonManager({ ...polygonManager, [name]: [] });
      setFocusItem(name);
    }
  };
  const handleMouseMove = (e) => {
    const stage = e.target.getStage();
    const mousePos = getMousePos(stage);
    setPosition(mousePos);
  };

  const handleMouseOverStartPoint = (e) => {
    if (isPolyComplete || points.length < 3) return;
    e.target.scale({ x: 3, y: 3 });
    setMouseOverPoint(true);    
  };

  const handleMouseOutStartPoint = (e) => {
    e.target.scale({ x: 1, y: 1 });
    setMouseOverPoint(false);
  };

  const handlePointDragMove = (e) => {
    const stage = e.target.getStage();
    const index = e.target.index - 1;
    const pos = [e.target._lastPos.x, e.target._lastPos.y];
    if (pos[0] < 0) pos[0] = 0;
    if (pos[1] < 0) pos[1] = 0;
    if (pos[0] > stage.width()) pos[0] = stage.width();
    if (pos[1] > stage.height()) pos[1] = stage.height();
    setPoints([...points.slice(0, index), pos, ...points.slice(index + 1)]);
  };

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
    setPolyComplete(false);
  };

  const apply_change = () => {
    completedDrawer()
    if (size.width === undefined || size.height === undefined) {
      enqueueSnackbar("Image not found", { variant: "error" });
      return;
    }
    const scale = [1 / size.width, 1 / size.height];
    const lineManagerValues = Object.fromEntries(
      Object.entries(lineManager).map(([name, line]) => [
        name,
        line.map((point) => [point[0] * scale[0], point[1] * scale[1]]),
      ])
    );

    const polygonManagerValues = Object.fromEntries(
      Object.entries(polygonManager).map(([name, zone]) => [
        name,
        zone.map((point) => [point[0] * scale[0], point[1] * scale[1]]),
      ])
    );
    console.log(cameraId);
    if (!cameraId) {
      enqueueSnackbar("Please select camera", { variant: "error" });
      return;
    }
    if (!serviceName) {
        enqueueSnackbar("Please select service", { variant: "error" });
        return;
    }

    apiUpdateCamera({
      camera_id: cameraId,
      data: {
        services: [
          {
            service_name: serviceName,
            data: {
              cross_line: lineManagerValues,
              polygon_zone: polygonManagerValues,
            },
            enable: true,
          },
        ],
      },
    })
      .then((res) => {
        applyCallback();
        enqueueSnackbar("Add metadata successfully", {
          variant: "success",
        });
      })
      .catch((err) => {
        enqueueSnackbar("Add metadata failed!", { variant: "error" });
      });
  };

  const deleleItem = (name) => {
    if (typeIndex === 0) {
      let newLineManager = { ...lineManager };
      delete newLineManager[name];
      setLineManager(newLineManager);
      setLineFinished(lineFinished.filter((line, i) => line !== name));
    } else {
      let newZoneManager = { ...polygonManager };
      delete newZoneManager[name];
      setPolygonManager(newZoneManager);
      setPolygonFinished(polygonFinished.filter((zone, i) => zone !== name));
    }
    if (focusItem === name) {
      setFocusItem(null);
      reset();
    }
  };

  const handleGroupDragEnd = (e) => {
    if (e.target.name() === "polygon") {
      let result = [];
      let copyPoints = [...points];
      copyPoints.map((point) =>
        result.push([point[0] + e.target.x(), point[1] + e.target.y()])
      );
      e.target.position({ x: 0, y: 0 });
      setPoints(result);
    }
  };

  const hoverItem = (name) => {
    if (typeIndex === 0) {
      if (lineManager[name] !== undefined) {
        setHoverPoints(lineManager[name]);
        setHoverFlattenedPoints(
          lineManager[name].reduce((a, b) => a.concat(b), [])
        );
      }
    } else {
      if (polygonManager[name] !== undefined) {
        setHoverPoints(polygonManager[name]);
        setHoverFlattenedPoints(
          polygonManager[name].reduce((a, b) => a.concat(b), [])
        );
      }
    }
  };
  useEffect(() => {
    if (typeIndex === 0) {
      if (lineFinished.includes(focusItem)) {
        setPoints(lineManager[focusItem]);
        setPolyComplete(true);
      } else {
        setPoints([]);
        setPolyComplete(false);
      }
    } else {
      if (polygonFinished.includes(focusItem)) {
        setPoints(polygonManager[focusItem]);
        setPolyComplete(true);
      } else {
        setPolyComplete(false);
        setPoints([]);
      }
    }
  }, [focusItem, typeIndex]);
  const handleChangeTypeIndex = (event, newValue) => {
    setTypeIndex(newValue);
  };

  function a11yProps(index) {
    return {
      id: `simple-tab-${index}`,
      "aria-controls": `simple-tabpanel-${index}`,
    };
  }

  return (
    <div className="camera-drawer flex justify-start items-start bg-gray-100 p-5 gap-10">
      <div className="w-[300px] rounded-md text-black bg-gray-300 p-5">
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tabs value={typeIndex} onChange={handleChangeTypeIndex}>
            <Tab label="Line" {...a11yProps(0)} />
            <Tab label="Polygon" {...a11yProps(1)} />
          </Tabs>
        </Box>
        <List>
          <Button className="m-2" onClick={addItem}>
            Add
          </Button>
          {Array.from(itemListName).map((item, index) => (
            <ListItem
              key={index}
              disablePadding
              secondaryAction={
                <IconButton edge="end" aria-label="delete">
                  <DeleteIcon onClick={() => deleleItem(item)} />
                </IconButton>
              }
            >
              <ListItemButton
                onClick={() => setFocusItem(item)}
                onMouseOver={() => {
                  focusItem === item ? "" : hoverItem(item);
                }}
                onMouseOut={() => {
                  setHoverFlattenedPoints([]);
                  setHoverPoints([]);
                }}
                selected={focusItem === item}
                component="a"
                href="#"
              >
                <input type="text" value={item} className="bg-transparent text-xl text-black border-none h-[30px] focus:outline-none focus:ring-0 focus:shadow-none" name="" id="" />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </div>
      <div className="flex-1 flex flex-col space-y-10 p-4 border-1 border-dashed border-gray-500 rounded-md w-full h-full">
        <div className="flex">
          <div style={wrapperStyle}>
            <div className="flex-1">
              <Stage
                width={size.width || 650}
                height={size.height || 302}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
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
                    color="#00CD00"
                    fill="rgba(124 ,252 ,0, 0.5)"
                    circle_fill="#00CD00"
                    flattenedPoints={flattenedPoints}
                    hoverPoints={hoverPoints}
                    hoverFlattenedPoints={hoverFlattenedPoints}
                    handlePointDragMove={handlePointDragMove}
                    handleGroupDragEnd={handleGroupDragEnd}
                    handleMouseOverStartPoint={handleMouseOverStartPoint}
                    handleMouseOutStartPoint={handleMouseOutStartPoint}
                    isFinished={isPolyComplete}
                  />
                  <PolygonAnnotation
                    points={hoverPoints}
                    flattenedPoints={hoverFlattenedPoints}
                    isFinished={true}
                    color="#CD3278"
                    fill="rgba(139, 139, 122, 0.7)"
                    circle_fill="#458B00"
                  />
                </Layer>
              </Stage>
            </div>
            <div className="flex justify-start mt-5 gap-2">
              {/* <Button
                variant="outlined"
                onClick={undo}
                startIcon={<UndoIcon />}
              >
                Polygon
              </Button>
              <Button
                variant="outlined"
                onClick={undo}
                startIcon={<UndoIcon />}
              >
                Line
              </Button> */}
              <Button
                variant="outlined"
                onClick={undo}
                startIcon={<UndoIcon />}
              >
                Undo
              </Button>
              <Button
                variant="outlined"
                onClick={reset}
                startIcon={<BlockIcon />}
              >
                Reset
              </Button>
              <Button
                variant="outlined"
                onClick={() => completedDrawer()}
                startIcon={<UndoIcon />}
              >
                Save
              </Button>
              <Button
                sx={{ ml: "auto" }}
                variant="contained"
                onClick={apply_change}
                startIcon={<DoneOutlineIcon />}
              >
                Apply
              </Button>
            </div>
          </div>
          {serviceName === "ReID" && cameraId && (
            <div className="text-left rounded-md text-black">
              <Button className="p-4 m-2 bg-slate-500 w-fit text-white">
                Add Connection
              </Button>
              <ul className="p-4 text-left">
                <li className="inline-block m-2">
                  <SearchOptionBar data={camera_groups} label="Groups" />
                </li>
                <li className="inline-block m-2">
                  <SearchOptionBar data={camera_groups} label="Lines" />
                </li>
                <li className="inline-block m-2">
                  <SearchOptionBar data={direction} label="Direction" />
                </li>
                <li className="block mb-2 text-right">
                  <Button className="p-4 w-[80px] text-white bg-blue-500">
                    Add
                  </Button>
                </li>
              </ul>
            </div>
          )}
        </div>
        {serviceName === "ReID" && cameraId && (
          <DataTable columns={columns} rows={rows} />
        )}
      </div>
    </div>
  );
};

export default CameraDrawer;
