import { useEffect, useState, useMemo, useRef } from "react";
import OrderCard from "./OrderCard";
import { getData } from "../../../helperfunction.js";
import { io } from "socket.io-client";
import { useAuthContext } from "../../../context/AuthContext.jsx";

function Order() {
  const [ordersDetails, setOrdersDetails] = useState([]);
  const socket = useMemo(
    () => io(`${import.meta.env.VITE_SERVER_ENDPOINT}`),
    [],
  );
  const orderIdsRef = useRef([]);
  const { user } = useAuthContext();
  console.log(user);

  useEffect(() => {
    const getOrders = async () => {
      let ordersDetails = await getData("order");
      console.log(ordersDetails);
      if (ordersDetails.length === 0) ordersDetails = [];
      setOrdersDetails(Array.isArray(ordersDetails) ? ordersDetails : []);
    };
    getOrders();

    console.log(socket.id);
    console.log(ordersDetails.length);
    if (ordersDetails.length > 0) {
      const orderIds = (ordersDetails || []).map((orderdetail) => orderdetail._id);
      orderIdsRef.current = orderIds; // update ref with the latest orderIds
      socket.emit("my-orders", orderIds);
    } else {
      socket.emit("my-orders", []);
    }
  }, [ordersDetails.length]);

  useEffect(() => {
    socket.on(
      "updated-status",
      ({ orderId, status, subOrderId, updatedTime }) => {
        console.log("received updated status", updatedTime);

        if (subOrderId) {
          console.log("in to update suborder", subOrderId);
          setOrdersDetails((prevData) =>
            prevData.map((ordersDetail) => {
              if (ordersDetail._id == orderId) {
                const orders = ordersDetail.orders.map((order) => {
                  if (order._id === subOrderId)
                    return { ...order, status: status, updatedAt: updatedTime };
                  else return order;
                });
                return { ...ordersDetail, orders };
              } else {
                return ordersDetail;
              }
            }),
          );
        } else {
          setOrdersDetails((prevData) =>
            prevData.map((ordersDetail) => {
              if (ordersDetail._id === orderId)
                return {
                  ...ordersDetail,
                  status: status,
                  orders: ordersDetail.orders.map((order) => ({
                    ...order,
                    status: status,
                    updatedAt: updatedTime,
                  })),
                };
              return ordersDetail;
            }),
          );
        }
      },
    );

    return () => {
      const orderIds = orderIdsRef.current;
      socket.off("connect");
      socket.off("updated-status");
      socket.emit("remove-orders", orderIds, () => {
        console.log("Disconnecting User");
        socket.disconnect();
      });
    };
  }, [socket]);

  console.log(ordersDetails);
  return (
    <section className="dashboard-order">
      <div className="title">
        <i className="fa-regular fa-message"></i>
        <span className="text">Orders</span>
      </div>
      <div className="orders">
        {ordersDetails?.length > 0 ? (
          ordersDetails.map((orderDetail) => (
            <OrderCard
              orderDetail={orderDetail}
              key={orderDetail._id}
              user={user}
              onOrderCancelled={(orderId) =>
                setOrdersDetails((prev) => prev.filter((o) => o._id !== orderId))
              }
            />
          ))
        ) : (
          <div className="no-orders">
            <p className="label-1">No Orders Placed Yet!</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default Order;
