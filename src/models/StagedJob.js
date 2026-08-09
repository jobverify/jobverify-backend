import { model } from "mongoose";
import { JobSchema } from "./Job.js";

const StagedJob = model("StagedJob", JobSchema, "jobs_staging");

export default StagedJob;
