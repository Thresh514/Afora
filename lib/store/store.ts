import { configureStore } from "@reduxjs/toolkit";
import stageStatusReducer from "./features/stageStatus/stageStatusSlice";
export const store = configureStore({
  reducer: {
    stageStatus: stageStatusReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
