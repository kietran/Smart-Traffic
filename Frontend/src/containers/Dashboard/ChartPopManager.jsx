import { useEffect, useState } from "react";
import Traffic from "./Traffic";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Speed from "./Speed";
function ChartPopManager() {
  const [mode, setMode] = useState(0);
  const [value, setValue] = useState(0);

  useEffect(() => {}, []);

  return (
    <>
      <div className="relative">
        {mode === 0 && <Traffic />}
        {mode === 1 && <Speed />}
        <Stack className="absolute top-0 right-0" spacing={2} direction="row">
          <Button onClick={() => setMode(0)} variant="contained">
            Density
          </Button>
          <Button onClick={() => setMode(1)} variant="contained">
            Speed
          </Button>
        </Stack>
      </div>
    </>
  );
}

export default ChartPopManager;
