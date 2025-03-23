# Collect test source files
file(GLOB_RECURSE UNIT_TEST_SOURCES "*.cpp")

# Create unit test executable
add_executable(unit_tests ${UNIT_TEST_SOURCES})

# Link dependencies
target_link_libraries(unit_tests
    PRIVATE
    gtest
    gtest_main
    sonora-core
    sonora-providers
)

# Add test to CTest
add_test(NAME UnitTests COMMAND unit_tests)