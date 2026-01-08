import { useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Buttons(data: any) {
  const [disabledValue, setDisabledValue] = useState(false);
  console.log(data,"this is data");
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const bindchoics = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.record.msg.options.map((val: any) => (
      <>
        {/* {" "} */}
        <button
          // console.log("")
          id={val.options}
          disabled={disabledValue}
          className={
            disabledValue
              ? "btn btn-outline-primary-disabled"
              
              : "btn btn-outline-primary"
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(e: any) => {
              setDisabledValue(true);
              data.record.func(e.target.id, "btn");
          }}
        >
          {val.options}
        </button>
      </>
    ));
  };
  return (
    <>
            {/* <div className="d-flex flex-column align-items-start"> */}
                 Are you satisfied with the answers provided?        
            {/* </div> */}
              
    </>
  )
}