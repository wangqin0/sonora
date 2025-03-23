# Configure GoogleTest to suppress sign-conversion warnings
function(configure_gtest_warnings)
  if(TARGET gtest)
    set_target_properties(gtest PROPERTIES
      COMPILE_FLAGS "-Wno-sign-conversion")
  endif()
  
  if(TARGET gtest_main)
    set_target_properties(gtest_main PROPERTIES 
      COMPILE_FLAGS "-Wno-sign-conversion")
  endif()
  
  if(TARGET gmock)
    set_target_properties(gmock PROPERTIES
      COMPILE_FLAGS "-Wno-sign-conversion")
  endif()
  
  if(TARGET gmock_main)
    set_target_properties(gmock_main PROPERTIES
      COMPILE_FLAGS "-Wno-sign-conversion")
  endif()
endfunction()