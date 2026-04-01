# yodo
This tool proves how easy it is to become root via limited sudo permissions, via `dirty COW` or using `Pa(th)zuzu`.

`dirty COW`: exploits a race condition in the implementation of the copy-on-write mechanism
Link : [https://dirtycow.ninja](https://dirtycow.ninja)

`Pa(th)zuzu`: Checks for PATH substitution vulnerabilities, logs the commands executed by the vulnerable executables and injects commands with the permissions of the owner of the process (SUID)
Link: [https://github.com/ShotokanZH/Pa-th-zuzu](https://github.com/ShotokanZH/Pa-th-zuzu)


## Extra features
-
VSP : checks if the user is able to overwrite a sudo-enabled command with his own

History : checks for * history (like bash_history) files. You could be lucky!

b3 : tries to substitute commands that has root privileges [sudo -l >>> User may run the following commands ... (root) NOPASSWD: /path/to/script]

Example
If a user has sudo privileges only on vi, he could become root by running this command: 

`sudo vi -c ':shell'`

`b3rito@victim ~/Desktop $ sudo vi -c ':shell'`
`[sudo] password for b3rito:`
`victim Desktop # whoami`
`root`

## Author
Written by `b3rito` at mes3hacklab
Github: [https://github.com/b3rito/yodo/](https://github.com/b3rito/yodo/)