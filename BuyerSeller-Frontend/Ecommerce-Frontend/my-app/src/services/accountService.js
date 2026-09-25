import {
  getCurrentProfile,
  updateCurrentUser,
} from "./authService.js";
import axiosClient from "./axiosClient.js";
import { AUTH_ENDPOINTS } from "../config/apiEndpoints.js";

const toPublicProfile = (user) => ({
  userId: user.userId,
  fullName: user.fullName || "",
  email: user.email || "",
  phoneNumber: user.phoneNumber || "",
  role: user.role || "",
  profilePhoto: user.profilePhoto || "",
});

export const getMyProfile = async () => {
  return toPublicProfile(await getCurrentProfile());
};

export const updateMyProfile = async (profileData) => {
  const updatedUser = await updateCurrentUser({
    fullName: profileData.fullName,
    phoneNumber: profileData.phoneNumber,
  });

  return toPublicProfile(updatedUser);
};

export const changeMyPassword = async (passwordData) => {
  const currentPassword = passwordData.currentPassword || "";
  const newPassword = passwordData.newPassword || "";

  if (
    passwordData.confirmPassword !== undefined &&
    newPassword !== passwordData.confirmPassword
  ) {
    throw new Error("Passwords do not match.");
  }

  await axiosClient.post(AUTH_ENDPOINTS.changePassword, {
    currentPassword,
    newPassword,
  });

  return { success: true };
};
