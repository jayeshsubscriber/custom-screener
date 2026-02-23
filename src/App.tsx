import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScansDesktop } from "@/pages/ScansDesktop";
import { StandaloneScreenerPage } from "@/pages/StandaloneScreenerPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/all" element={<ScansDesktop />} />
        <Route path="*" element={<StandaloneScreenerPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
