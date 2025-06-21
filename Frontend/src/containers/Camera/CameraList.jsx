import * as React from "react";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import { visuallyHidden } from "@mui/utils";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import { styled } from "@mui/material/styles";
import ChipList from "./ChipList";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Chip from "@mui/material/Chip";
import FaceIcon from "@mui/icons-material/Face";
import BorderColorIcon from "@mui/icons-material/BorderColor";
import {
  apiGetCamera,
  apiDeleteCameraId,
  apiUpdateCameraStatus,
} from "../../connectDB/axios";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/Add";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Link from "@mui/material/Link";
import Confirmation from "../../components/Confirmation";

function createData(id, camera_name, camera_id, ai_engines, status, action) {
  return {
    id,
    camera_name,
    camera_id,
    ai_engines,
    status,
    action,
  };
}

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}
const headCells = [
  {
    id: "camera_name",
    numeric: false,
    disablePadding: true,
    label: "Camera name",
    sort: true,
  },
  {
    id: "camera_id",
    numeric: true,
    disablePadding: false,
    label: "Camera Id",
    sort: true,
  },
//   {
//     id: "ai_engines",
//     numeric: true,
//     disablePadding: false,
//     label: "AI Engines",
//     sort: true,
//   },
  {
    id: "status",
    numeric: true,
    disablePadding: false,
    label: "Status",
    sort: true,
  },
  {
    id: "actions",
    numeric: true,
    disablePadding: false,
    label: "Actions",
    sort: true,
  },
];
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: "#f5f5f5",
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "left",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 13,
    textAlign: "left",
  },
}));
function EnhancedTableHead(props) {
  const {
    onSelectAllClick,
    order,
    orderBy,
    numSelected,
    rowCount,
    onRequestSort,
  } = props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <StyledTableCell padding="checkbox">
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{
              "aria-label": "select all desserts",
            }}
          />
        </StyledTableCell>

        {headCells.map((headCell) => (
          <StyledTableCell
            key={headCell.id}
            align={headCell.numeric ? "right" : "left"}
            padding={headCell.disablePadding ? "none" : "normal"}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : "asc"}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === "desc" ? "sorted descending" : "sorted ascending"}
                </Box>
              ) : null}
            </TableSortLabel>
          </StyledTableCell>
        ))}
        <StyledTableCell></StyledTableCell>
      </TableRow>
    </TableHead>
  );
}

export default function CameraList() {
  const [order, setOrder] = React.useState("asc");
  const [orderBy, setOrderBy] = React.useState("camera_name");
  const [selected, setSelected] = React.useState([]);
  const [page, setPage] = React.useState(0);
  const [dense, setDense] = React.useState(false);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [rows, setRows] = React.useState([]);
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);
  const setShowConfirm = (value, action = null) => {
    setShowConfirmDelete(value);

    if (action === "yes") {
      handleRemove();
    }
  };
  const handleRemove = () => {
    let removed_ids = [];

    selected.forEach((id) => {
      removed_ids.push(id);

      apiDeleteCameraId({ id })
        .then((res) => {
          console.log(res);
        })
        .catch((err) => {
          console.error(err);
        });
    });
    let new_rows = rows.filter((row) => !removed_ids.includes(row.id));
    setSelected([]);
    setRows(new_rows);
  };
  React.useEffect(() => {
    const fetchData = async () => {
      await apiGetCamera()
        .then((res) => {
          const { data } = res;
          let new_rows = [];
          data.forEach((item, index) => {
            let id = item.camera_id;
            let camera_name = item.camera_name;
            let camera_id = item.camera_id;
            let ai_engines = Object.entries(item.services)
              .filter(([key, value]) => value.enable)
              .map(([key, _]) => key);
            let status = item.status;
            let rp = createData(
              id,
              camera_name,
              camera_id,
              ai_engines,
              status,
              status
            );
            new_rows.push(rp);
          });

          setRows(new_rows);
        })
        .catch((err) => {
          console.error(err);
        });
    };

    fetchData();
  }, []);
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = rows.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }
    setSelected(newSelected);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleChangeDense = (camera_id) => {
    let current_rows = rows;
    console.log(camera_id, current_rows);
    current_rows.map((row, index) => {
      if (row.camera_id === camera_id) {
        row.status = !row.status;
        apiUpdateCameraStatus({ id: camera_id, status: row.status })
          .then((res) => {
            console.log(res);
          })
          .catch((err) => {
            console.error(err);
          });
      }
      return row;
    });
    setRows([...current_rows]);
  };

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;
  const visibleRows = React.useMemo(
    () =>
      [...rows]
        .sort(getComparator(order, orderBy))
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [rows, order, orderBy, page, rowsPerPage]
  );

  return (
    <Box sx={{ padding: 2, ml: 5, mr: 5 }}>
      <Confirmation
        title="Do you agree to delete this camera?"
        desc="This action cannot be undone!!!"
        open={showConfirmDelete}
        setOpen={setShowConfirm}
      />

      <Paper sx={{ width: "100%", mb: 2 }}>
        <Toolbar
          sx={[
            {
              pl: { sm: 2 },
              pr: { xs: 1, sm: 1 },
            },
            selected.length > 0 && {
              bgcolor: (theme) =>
                alpha(
                  theme.palette.primary.main,
                  theme.palette.action.activatedOpacity
                ),
            },
          ]}
        >
          {selected.length > 0 ? (
            <Typography
              sx={{ flex: "1 1 100%" }}
              color="inherit"
              variant="subtitle1"
              component="div"
            >
              {selected.length} selected
            </Typography>
          ) : (
            <Typography
              sx={{ flex: "1 1 100%" }}
              variant="h6"
              id="tableTitle"
              component="div"
            >
              Camera List
            </Typography>
          )}
          {selected.length > 0 ? (
            <Tooltip title="Delete">
              <IconButton>
                <DeleteIcon onClick={() => setShowConfirm(true)} />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Filter list">
              <IconButton>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          )}

          <Fab
            color="primary"
            aria-label="add"
            size="small"
            style={{ marginLeft: 20, marginRight: 10, padding: 10 }}
          >
            <Link
              style={{ backgroundColor: "transparent" }}
              href="/cameras/add"
              underline="none"
              color="inherit"
            >
              <AddIcon />
            </Link>
          </Fab>
        </Toolbar>
        <TableContainer>
          <Table
            sx={{ minWidth: 750 }}
            aria-labelledby="tableTitle"
            size={"medium"}
          >
            <EnhancedTableHead
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={rows.length}
            />
            <TableBody>
              {visibleRows.map((row, index) => {
                const isItemSelected = selected.includes(row.id);
                const labelId = `enhanced-table-checkbox-${row.id}`;
                return (
                  <TableRow
                    hover
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={index}
                    selected={isItemSelected}
                    sx={{ cursor: "pointer" }}
                  >
                    <StyledTableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        onClick={(event) => handleClick(event, row.id)}
                        inputProps={{
                          "aria-labelledby": labelId,
                        }}
                      />
                    </StyledTableCell>
                    <StyledTableCell
                      component="th"
                      id={labelId}
                      scope="row"
                      padding="none"
                    >
                      {row.camera_name}
                    </StyledTableCell>
                    <StyledTableCell align="right">
                      {row.camera_id}
                    </StyledTableCell>
                    {/* <StyledTableCell align="right" style={{ minWidth: 300 }}>
                      <ChipList chipData={row.ai_engines} />
                    </StyledTableCell> */}
                    <StyledTableCell>
                      <Chip
                        label={`${row.status ? "connected" : "disconected"}`}
                        color={`${row.status ? "success" : "default"}`}
                        icon={
                          row.status ? (
                            <CheckCircleOutlineIcon />
                          ) : (
                            <HighlightOffIcon />
                          )
                        }
                        variant="fill"
                      />
                    </StyledTableCell>
                    <StyledTableCell align="right" style={{ width: 10 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={row.status}
                            onChange={() => handleChangeDense(row.camera_id)}
                          />
                        }
                      />
                    </StyledTableCell>
                    <StyledTableCell>
                      <Link href={`cameras/edit/${row.camera_id}/info`}>
                        {" "}
                        <BorderColorIcon />
                      </Link>
                    </StyledTableCell>
                  </TableRow>
                );
              })}
              {emptyRows > 0 && (
                <TableRow
                  style={{
                    height: 53 * emptyRows,
                  }}
                >
                  <StyledTableCell colSpan={6} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
}
