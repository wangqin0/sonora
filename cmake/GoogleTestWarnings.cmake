# Suppress warnings in Google Test / Google Mock builds
set(GTEST_WARNING_FLAGS "-Wno-sign-conversion")

if(TARGET gtest)
  target_compile_options(gtest PRIVATE ${GTEST_WARNING_FLAGS})
endif()

if(TARGET gtest_main)
  target_compile_options(gtest_main PRIVATE ${GTEST_WARNING_FLAGS})
endif()

if(TARGET gmock)
  target_compile_options(gmock PRIVATE ${GTEST_WARNING_FLAGS})
endif()

if(TARGET gmock_main)
  target_compile_options(gmock_main PRIVATE ${GTEST_WARNING_FLAGS})
endif()