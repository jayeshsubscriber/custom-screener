import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScansDesktop } from "@/pages/ScansDesktop";
import { StandaloneScreenerPage } from "@/pages/StandaloneScreenerPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/screener" element={<StandaloneScreenerPage />} />
        <Route path="*" element={<ScansDesktop />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
