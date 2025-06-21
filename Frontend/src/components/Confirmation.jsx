import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

export default function Confirmation({
  title = "Dialog Title",
  desc = "Dialog Content",
  open,
  setOpen,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <React.Fragment>
      <Dialog
        fullScreen={fullScreen}
        open={open}
        onClose={() => setOpen(false, "onclose")}
        aria-labelledby="responsive-dialog-title"
      >
        <DialogTitle id="responsive-dialog-title">{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{desc}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={() => setOpen(false, "no")}>
            No
          </Button>
          <Button onClick={() => setOpen(false, "yes")} autoFocus>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
