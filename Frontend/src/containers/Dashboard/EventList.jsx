import { useEffect, useState, useRef } from "react";
import {
  Grid,
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TablePagination from "@mui/material/TablePagination";
import InfoIcon from "@mui/icons-material/Info";
import InfoTooltip from "./InfoTooltip";
import { keyframes } from "@mui/material/styles";

const blink = keyframes`
  0% { background-color: #e3f2fd; }
  50% { background-color: #bbdefb; }
  100% { background-color: #e3f2fd; }
`;



const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow, {
    shouldForwardProp: (prop) => prop !== "isNew",
  })(({ theme, isNew }) => ({
    "&:nth-of-type(odd)": {
      backgroundColor: theme.palette.action.hover,
    },
    "&:last-child td, &:last-child th": {
      border: 0,
    },
    transition: "border-left 0.4s ease, background-color 0.4s ease",
    ...(isNew && {
      animation: `${blink} 0.7s ease-in-out 4`,
      borderLeft: "5px solid #2196f3",
    }),
  }));


const StyledTableNewRow = styled(TableRow, {
    shouldForwardProp: (prop) => prop !== "isNew",
})(({ theme, isNew }) => ({
    transition: "border-left 0.4s ease",
    
    ...(isNew && {
        animation: `${blink} 0.7s ease-in-out 4`, // chớp 3 lần trong 3 giây
    }),
}));

// const StyledTableNewRow = styled(TableRow)(({ theme, isNew }) => ({

//     transition: "border-left 0.4s ease",
//     borderLeft: "5px solid #2196f3",
//     backgroundColor: isNew ? "red" : "white",

//     }));
function createData(name, calories, fat, carbs, protein) {
  return { name, calories, fat, carbs, protein };
}

function EventList({ rows, setReviewImage, setOpenDetail, oldrows=[], cameraId=null, areaId=null}) {
    const [count, setCount] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [vehicleInfo, setVehicleInfo] = useState({});
    const wsRef = useRef(null);

    const [newRows, setNewRows] = useState([]);
    const [newRowIds, setNewRowIds] = useState([]);
    const camera_id = useRef(null);
    const area_id = useRef(null);
    const reconnectTimer = useRef(null);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };
  const [hoverId, setHoverID] = useState(false);

  const handleMouseEnter = (data) => {
    setHoverID(data.id);
    setVehicleInfo(data);
  };

  const handleMouseLeave = () => {
    setHoverID(-1);
  };

  // Handler for row hover

  const handleInfoClick = (row) => {
    setOpenDetail({ open: true, row: row });
  };

  useEffect(() => { 
    console.log("cameraId", cameraId, areaId)
    if (cameraId || areaId) {   
        setNewRows([]);
        setPage(0);
        camera_id.current = cameraId;
        area_id.current = areaId;

        } else {
        setPage(0);
        }
    }, [cameraId, areaId]);

  const format_event = (event) => {
    event.full_thumbnail_path = event.full_thumbnail_path?.replace(
        "192.168.101.4",
        "100.112.243.28"
      );
      event.target_thumbnail_path = event.target_thumbnail_path?.replace(
        "192.168.101.4",
        "100.112.243.28"
      );
      event.data.plate_thumb_path = event.data.plate_thumb_path?.replace(
        "192.168.101.4",
        "100.112.243.28"
      );
      let start_time = event.start_time;
      if (typeof start_time === "number") {
          start_time = start_time * 1000;
      }
      const start_date = new Date(start_time).toLocaleString("en-US", {
          timeZone: "Asia/Ho_Chi_Minh",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
      });
      
      
      return {
        full_image: event.full_thumbnail_path,
        target_image: event.target_thumbnail_path,
        plate_image: event.data.plate_thumb_path,
        lpr: event.data.target_label,
        start_time: start_date,
        event_type: event.event_type,
        camera_id: event.camera_id,
        is_reviewed: event.is_reviewed,
        metadata: event.data,
      };
    }


    useEffect(() => {
      const ws = new WebSocket("ws://100.112.243.28:1239/events"); // ✅ Thay bằng URL WebSocket server của bạn
      wsRef.current = ws;
      ws.onopen = () => {
        console.log("🟢 Connected to WebSocket");
      };
  
      ws.onmessage = (event) => {
        let data = JSON.parse(event.data);
      
        if (data.event_type === "license_plate") {
            if (camera_id && data.camera_id !== camera_id) {
                return;
            }
            if (area_id && data.area_id !== area_id) {
                return;
            }
            
            const formatted = format_event(data);
            console.log("### cameraId", camera_id,area_id, formatted)
          const uniqueId = Date.now();
          formatted.id = uniqueId;
            
          setNewRows((prevRows) => [formatted, ...prevRows]);
          setNewRowIds((prev) => [...prev, uniqueId]);
      
          // Gỡ hiệu ứng sau 5s
          setTimeout(() => {
            setNewRowIds((prev) => prev.filter((id) => id !== uniqueId));
          }, 5000);
        }
      };
      
  
      ws.onerror = (err) => {
        console.error("❌ WebSocket error:", err);
      };
  
      ws.onclose = () => {
        console.warn("🔴 WebSocket disconnected");
        reconnectTimer.current = setTimeout(() => connect(), 1000); // 🔁 Retry sau 3 giây
      };
  
      // Cleanup khi component unmount
      return () => {
        ws.close();
      };
    }, []);

  return (
    <>
      <Box sx={{ height: "100%" }}>
        <Paper sx={{ border: "1px solid #ccc", padding: 1 }}>
          <TableContainer
            component={Paper}
            sx={{
              overflowX: "auto",
              overflowY: "auto",
              maxHeight: 720,
            }}
          >
            <Table stickyHeader aria-label="customized table">
              <TableHead>
                <TableRow>
                  <StyledTableCell align="center"></StyledTableCell>
                  <StyledTableCell align="center">
                    Target Vehicle
                  </StyledTableCell>
                  <StyledTableCell align="center">Plate</StyledTableCell>
                  <StyledTableCell align="center">
                    License Plate
                  </StyledTableCell>
                  <StyledTableCell align="center">Occur Time</StyledTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
              {newRows
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row) => (
                    <StyledTableRow key={row.id} 
                    isNew={newRowIds.includes(row.id)}
                    >
                      <StyledTableCell
                        align="center"
                        component="th"
                        scope="row"
                      >
                        {hoverId === row.id ? (
                          <InfoTooltip vehicleInfo={vehicleInfo}>
                            <InfoIcon
                              onMouseEnter={() => handleMouseEnter(row)}
                              onMouseLeave={handleMouseLeave}
                              onClick={() => handleInfoClick(row)}
                              sx={{
                                cursor: "pointer",
                                color: "black",
                                transition: "color 0.3s",
                              }}
                            />
                          </InfoTooltip>
                        ) : (
                          <InfoIcon
                            onMouseEnter={() => handleMouseEnter(row)}
                            onMouseLeave={handleMouseLeave}
                            sx={{
                              cursor: "pointer",
                              color: "gray",
                              transition: "color 0.3s",
                            }}
                          />
                        )}
                      </StyledTableCell>
                      <StyledTableCell align="center">
                        <div
                          style={{
                            width: "100px",
                            height: "80px",
                            backgroundImage: `url(${row.full_image})`,
                            backgroundSize: "contain",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            borderRadius: "4px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          }}
                        ></div>
                      </StyledTableCell>
                      <StyledTableCell align="center">
                        {/* <Box
                                                    component="img"
                                                    sx={{
                                                        height: 80,
                                                        width: 80,
                                                    }}
                                                    alt="The house from the offer."
                                                    src={row.plate_image}
                                                /> */}
                        <div
                          style={{
                            width: "80px",
                            height: "80px",
                            backgroundImage: `url(${row.plate_image})`,
                            backgroundSize: "contain",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            borderRadius: "4px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          }}
                        ></div>
                      </StyledTableCell>
                      <StyledTableCell align="center">
                        <p>{row.lpr}</p>
                      </StyledTableCell>
                      <StyledTableCell align="center">
                        {row.start_time.slice(0, 10)}
                        <br />
                        {row.start_time.slice(11, 19)}
                      </StyledTableCell>
                    </StyledTableRow>
                  ))}
                {rows
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row) => (
                    <StyledTableRow key={row.id}
                    >   
                      <StyledTableCell
                        align="center"
                        component="th"
                        scope="row"
                      >
                        {hoverId === row.id ? (
                          <InfoTooltip vehicleInfo={vehicleInfo}>
                            <InfoIcon
                              onMouseEnter={() => handleMouseEnter(row)}
                              onMouseLeave={handleMouseLeave}
                              onClick={() => handleInfoClick(row)}
                              sx={{
                                cursor: "pointer",
                                color: "black",
                                transition: "color 0.3s",
                              }}
                            />
                          </InfoTooltip>
                        ) : (
                          <InfoIcon
                            onMouseEnter={() => handleMouseEnter(row)}
                            onMouseLeave={handleMouseLeave}
                            sx={{
                              cursor: "pointer",
                              color: "gray",
                              transition: "color 0.3s",
                            }}
                          />
                        )}
                      </StyledTableCell>
                      <StyledTableCell align="center">
                        <div
                          style={{
                            width: "100px",
                            height: "80px",
                            backgroundImage: `url(${row.full_image})`,
                            backgroundSize: "contain",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            borderRadius: "4px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          }}
                        ></div>
                      </StyledTableCell>
                      <StyledTableCell align="center">
                        {/* <Box
                                                    component="img"
                                                    sx={{
                                                        height: 80,
                                                        width: 80,
                                                    }}
                                                    alt="The house from the offer."
                                                    src={row.plate_image}
                                                /> */}
                        <div
                          style={{
                            width: "80px",
                            height: "80px",
                            backgroundImage: `url(${row.plate_image})`,
                            backgroundSize: "contain",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            borderRadius: "4px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          }}
                        ></div>
                      </StyledTableCell>
                      <StyledTableCell align="center">
                        <p>{row.lpr}</p>
                      </StyledTableCell>
                      <StyledTableCell align="center">
                        {row.start_time.slice(0, 10)}
                        <br />
                        {row.start_time.slice(11, 19)}
                      </StyledTableCell>
                    </StyledTableRow>
                  ))}
              </TableBody>
            </Table>    
          </TableContainer>
 
            <TablePagination
                rowsPerPageOptions={[10, 25, 100]}
                component="div"
                count={rows.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
       

        </Paper>
      </Box>
    </>
  );
}

export default EventList;
