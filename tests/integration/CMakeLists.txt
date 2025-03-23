# Collect test source files
file(GLOB_RECURSE INTEGRATION_TEST_SOURCES "*.cpp")

# Create integration test executable if there are any source files
if(INTEGRATION_TEST_SOURCES)
    add_executable(integration_tests ${INTEGRATION_TEST_SOURCES})

    # Link dependencies
    target_link_libraries(integration_tests
        PRIVATE
        gtest
        gtest_main
        sonora-core
        sonora-providers
        sonora-cli
    )

    # Add test to CTest
    add_test(NAME IntegrationTests COMMAND integration_tests)
endif()