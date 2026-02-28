import Image from "next/image";
import Landing from "./landing/Landing";
import Login from "./landing/Login";
import Register from "./landing/Register";
export default function Home() {
  return (
    <div className="">
      {/* <Landing /> */}
      {/* <Login /> */}
      <Register />
    </div>
  );
}
