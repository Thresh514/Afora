import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface StageStatusState {
  status: boolean[];
}

const initialState: StageStatusState = {
  status: [],
};

const stageStatusSlice = createSlice({
  name: "stageStatus",
  initialState,
  reducers: {
    // update the status
    updateStatus: (state, action: PayloadAction<boolean[]>) => {
      state.status = action.payload;
    },
  },
});

export const { updateStatus } = stageStatusSlice.actions;

export default stageStatusSlice.reducer;
