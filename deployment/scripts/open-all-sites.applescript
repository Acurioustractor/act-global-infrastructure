(*
	ACT Ecosystem - Open All Sites in One Browser Window

	Opens all 6 ACT sites as tabs in a single Chrome window
*)

on run
	set siteURLs to {"http://localhost:3002", "http://localhost:3001", "http://localhost:3003", "http://localhost:3004", "http://localhost:3005", "http://localhost:3999"}

	tell application "Google Chrome"
		activate

		-- Check if Chrome has any windows open
		if (count of windows) = 0 then
			-- Create new window with first URL
			make new window
			set theWindow to front window
			set URL of active tab of theWindow to item 1 of siteURLs

			-- Open remaining URLs as new tabs in same window
			repeat with i from 2 to count of siteURLs
				tell theWindow
					make new tab with properties {URL:item i of siteURLs}
				end tell
			end repeat
		else
			-- Use existing window
			set theWindow to front window

			-- Open all URLs as new tabs
			repeat with theURL in siteURLs
				tell theWindow
					make new tab with properties {URL:theURL}
				end tell
			end repeat
		end if

		-- Activate first tab (ACT Studio)
		tell theWindow
			set active tab index to 1
		end tell
	end tell
end run
